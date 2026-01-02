"""
Canada Population Projection Engine
Cohort-Component Model with Adjustable Parameters

Usage:
    from projection_engine import project_population

    anchors, anchor_values, annual_projected = project_population(
        tfr=1.5,
        life_exp_male=82.0,
        life_exp_female=86.0,
        net_migration_annual=600000
    )
"""

import numpy as np
import json

# Load baseline model data
with open('canada_age_sex_observed_projected_2000_2100_v2.json', 'r') as f:
    MODEL_DATA = json.load(f)

AGES = MODEL_DATA['ages']
N_AGES = len(AGES)
BASELINE = MODEL_DATA['model']['baseline']

def adjust_survival(baseline_surv, life_exp_baseline, life_exp_target):
    """Adjust 5-year survival probabilities based on life expectancy change."""
    k = 0.06  # calibration factor
    le_diff = life_exp_target - life_exp_baseline
    mort_mult = np.exp(-k * le_diff)

    adjusted_surv = []
    for s in baseline_surv:
        if s is None:
            adjusted_surv.append(None)
        else:
            death_prob_5y = 1 - s
            adjusted_death_prob = death_prob_5y * mort_mult
            adjusted_surv.append(max(0, min(1, 1 - adjusted_death_prob)))

    return adjusted_surv

def scale_migration(baseline_dist, target_total):
    """Scale age/sex distribution to match target total."""
    baseline_total = sum(baseline_dist)
    if baseline_total == 0:
        return [0] * len(baseline_dist)
    scale = target_total / baseline_total
    return [x * scale for x in baseline_dist]

def compute_births_5y(female_pop, asfr_dict, tfr_mult, surv_male_0, surv_female_0):
    """Compute births over 5-year period."""
    adjusted_asfr = {age: rate * tfr_mult for age, rate in asfr_dict.items()}

    cb_ages = {
        '15 to 19 years': 3, '20 to 24 years': 4, '25 to 29 years': 5,
        '30 to 34 years': 6, '35 to 39 years': 7, '40 to 44 years': 8,
        '45 to 49 years': 9
    }

    total_births = 0
    for age, idx in cb_ages.items():
        women = female_pop[idx]
        rate = adjusted_asfr[age]
        births_from_age = women * (rate / 1000.0) * 5
        total_births += births_from_age

    sex_ratio_male = BASELINE['sex_ratio_at_birth']['male']
    sex_ratio_female = BASELINE['sex_ratio_at_birth']['female']

    male_births = total_births * sex_ratio_male * surv_male_0
    female_births = total_births * sex_ratio_female * surv_female_0

    return int(round(male_births)), int(round(female_births))

def project_population(
    base_year=2025,
    end_year=2100,
    tfr=None,
    life_exp_male=None,
    life_exp_female=None,
    net_migration_annual=None,
    anchor_step=5
):
    """
    Project population using cohort-component method.

    Parameters:
        tfr: Total fertility rate (default: baseline)
        life_exp_male: Male life expectancy at birth (default: baseline)
        life_exp_female: Female life expectancy at birth (default: baseline)
        net_migration_annual: Annual net migration (default: baseline)
        anchor_step: Years between anchor projections

    Returns:
        (anchors, anchor_values, annual_projected)
    """

    # Use baseline if not specified
    if tfr is None:
        tfr = BASELINE['tfr']
    if life_exp_male is None:
        life_exp_male = BASELINE['life_expectancy']['male']
    if life_exp_female is None:
        life_exp_female = BASELINE['life_expectancy']['female']
    if net_migration_annual is None:
        net_migration_annual = BASELINE['net_migration_annual']

    # Adjust survival rates
    baseline_surv_male = [BASELINE['survival_probability_5y_by_age']['male'][i] for i in range(N_AGES)]
    baseline_surv_female = [BASELINE['survival_probability_5y_by_age']['female'][i] for i in range(N_AGES)]

    surv_male = adjust_survival(baseline_surv_male, BASELINE['life_expectancy']['male'], life_exp_male)
    surv_female = adjust_survival(baseline_surv_female, BASELINE['life_expectancy']['female'], life_exp_female)

    # Scale migration
    baseline_mig_male = [BASELINE['net_migration_distribution_annual']['male'][i] for i in range(N_AGES)]
    baseline_mig_female = [BASELINE['net_migration_distribution_annual']['female'][i] for i in range(N_AGES)]

    mig_male = scale_migration(baseline_mig_male, net_migration_annual / 2)
    mig_female = scale_migration(baseline_mig_female, net_migration_annual / 2)

    # Adjust to exact total
    total_mig_scaled = sum(mig_male) + sum(mig_female)
    if total_mig_scaled > 0:
        adj_factor = net_migration_annual / total_mig_scaled
        mig_male = [m * adj_factor for m in mig_male]
        mig_female = [m * adj_factor for m in mig_female]

    # TFR multiplier
    tfr_mult = tfr / BASELINE['tfr']
    asfr_dict = BASELINE['asfr_per_1000_per_year']

    # Initialize
    anchors = list(range(base_year, end_year + 1, anchor_step))
    anchor_vals = {}
    anchor_vals[base_year] = {
        'male': MODEL_DATA['observed'][str(base_year)]['male'][:],
        'female': MODEL_DATA['observed'][str(base_year)]['female'][:]
    }

    # Project forward
    for a_prev, a_next in zip(anchors[:-1], anchors[1:]):
        prev_male = anchor_vals[a_prev]['male']
        prev_female = anchor_vals[a_prev]['female']

        next_male = [0] * N_AGES
        next_female = [0] * N_AGES

        # Age cohorts forward
        for i in range(1, N_AGES-1):
            next_male[i] = prev_male[i-1] * surv_male[i] + mig_male[i] * 5
            next_female[i] = prev_female[i-1] * surv_female[i] + mig_female[i] * 5

        # 100+ accumulation
        next_male[N_AGES-1] = prev_male[N_AGES-2] * surv_male[N_AGES-1] + prev_male[N_AGES-1] * surv_male[N_AGES-1] + mig_male[N_AGES-1] * 5
        next_female[N_AGES-1] = prev_female[N_AGES-2] * surv_female[N_AGES-1] + prev_female[N_AGES-1] * surv_female[N_AGES-1] + mig_female[N_AGES-1] * 5

        # Births
        m_births, f_births = compute_births_5y(prev_female, asfr_dict, tfr_mult, surv_male[0], surv_female[0])
        next_male[0] = m_births + mig_male[0] * 5
        next_female[0] = f_births + mig_female[0] * 5

        # Round
        next_male = [max(0, int(round(x))) for x in next_male]
        next_female = [max(0, int(round(x))) for x in next_female]

        anchor_vals[a_next] = {'male': next_male, 'female': next_female}

    # Interpolate annual
    projected = {}
    for year in range(base_year + 1, end_year + 1):
        lo = max([a for a in anchors if a <= year])
        hi = min([a for a in anchors if a >= year])

        if lo == hi:
            m = anchor_vals[lo]['male']
            f = anchor_vals[lo]['female']
        else:
            w = (year - lo) / (hi - lo)
            m = [int(round((1-w)*anchor_vals[lo]['male'][i] + w*anchor_vals[hi]['male'][i])) for i in range(N_AGES)]
            f = [int(round((1-w)*anchor_vals[lo]['female'][i] + w*anchor_vals[hi]['female'][i])) for i in range(N_AGES)]

        projected[str(year)] = {'male': m, 'female': f}

    return anchors, anchor_vals, projected

# Example usage
if __name__ == '__main__':
    print("Testing projection engine...")
    anchors, vals, proj = project_population(tfr=1.5, net_migration_annual=500000)
    print(f"Projected 2100 population: {sum(proj['2100']['male']) + sum(proj['2100']['female']):,}")
