# Cohort-Component Projection Model

## Overview

The population projection model implements a proper **cohort-component projection model** that simulates realistic demographic dynamics.

## How It Works

### 1. Fertility (Births)

**Input:** User's fertility slider (-100% to +100%)

**Process:**
- **Base Age-Specific Fertility Rates (ASFR):** Based on 2023-2024 Statistics Canada data for each 5-year age group
  - Ages 15-19: ASFR = 0.00405
  - Ages 20-24: ASFR = 0.02285
  - Ages 25-29: ASFR = 0.06375 (peak fertility)
  - Ages 30-34: ASFR = 0.0931
  - Ages 35-39: ASFR = 0.0552
  - Ages 40-44: ASFR = 0.01245
  - Ages 45-49: ASFR = 0.0009

- **Adjusted ASFR:** `baseline_ASFR × (1 + fertility%/100)`
  - Positive % = higher fertility
  - Negative % = lower fertility

- **Births Calculation:**
  ```
  births = Σ(women_in_age_group × ASFR_for_that_group)
  ```
  For each reproductive age group (15-49), multiply women population by ASFR and sum.

- **Total Fertility Rate (TFR):** Calculated as sum of all ASFRs × 5 (5-year spans)

- **Births split 51% female, 49% male**

**Output:** New cohort (ages 0-4) in next projected year

### 2. Mortality (Deaths)

**Input:** User's mortality slider (-100% to +100%)

**Process:**
- **Base rates by age/gender:** Loaded from 2023 Statistics Canada data (21 age groups × 2 genders)
- Each cohort has its own mortality rate (not a global rate)
- **Adjusted rate:** `base_rate × (1 + mortality%/100)` (per 1000 population)
  - Positive % = higher mortality
  - Negative % = lower mortality (improved survival)
- **Survival rate:** `1 - (adjusted_mortality_rate / 1000)`
- Each cohort survives forward with its age-specific survival rate
- **Global mortality rate:** Calculated from total deaths ÷ total population × 1000

**Example:**
```
Base rate for males 65-69: 15 per 1000
Scenario: mortality +10%
Adjusted rate: 15 × 1.10 = 16.5 per 1000
Mortality proportion: 16.5 / 1000 = 0.0165
Survival rate: 1 - 0.0165 = 0.9835
Cohort projection: population × 0.9835
```

### 3. Migration (Net Migration)

**Input:** User's migration slider (-100% to +100%)

**Process:**
- **Base net migration:** 400,000 people annually
- **Adjusted total:** `400,000 × (1 + migration%/100)`
- **Distribution by age/gender:** Based on 2024/2025 actual migration patterns
  - Immigrants by age group (Statistics Canada)
  - Non-permanent residents by age group
  - Emigration by age group
  - Net = Immigrants + Non-permanent - Emigration
- **Shares:** Each age-gender cohort gets a proportional share based on 2024/2025 distribution
- Migrants are added to each cohort

**Example:**
```
Base net migration: 400,000
Scenario: migration +50%
Adjusted: 400,000 × 1.50 = 600,000
Males 20-24 historical share: 8.5%
Males 20-24 in this year: 600,000 × 0.085 = 51,000
```

## Year-by-Year Projection

For each year from 2026 onwards:

```
1. Age all cohorts forward by 5 years (indices 0→1, 1→2, ..., 19→20)
2. Apply age-specific mortality rates to calculate survivors
3. Calculate births from reproductive-age females using ASFR
4. Add births to age 0-4 cohort (split 51% F, 49% M)
5. Distribute net migrants across all cohorts by age-gender shares
6. Handle oldest cohort (100+): apply mortality and age out
7. Result: Population for next year
```

## Technical Implementation

### Files

- **`cohortComponentProjection.js`** - Core projection engine
  - `projectOneYear()` - Project forward one year using ASFR
  - `projectToYear()` - Project to target year with caching
  - `calculateGlobalMortalityRate()` - Compute national mortality rate

- **`fertilityRates.js`** - ASFR data and calculations
  - `getAdjustedFertilityRates()` - Get ASFRs for given fertility scenario
  - `calculateBirthsFromASFR()` - Calculate births using age-specific rates
  - `calculateTFRFromASFR()` - Derive TFR from ASFRs

- **`mortalityRates.js`** - Mortality data loader
  - Loads 2023 age-gender mortality rates from Base_Mortality.csv
  - Provides per-cohort rates for calculations

- **`migrationDistribution.js`** - Migration data loader
  - Loads 2024/2025 migration by age-gender
  - Calculates proportional shares for distribution

- **`scenarioCalculations.js`** - Scenario orchestration
  - `applyScenarios()` - Applies cohort-component model for projected years
  - `getGlobalMortalityRate()` - Calculates displayed mortality rate

### Caching

Projections are cached to avoid recalculating when sliders change within the same year.
Cache is cleared when `onScenariosChanged()` is called.

## Key Differences from Previous Model

| Aspect | Previous | New |
|--------|----------|-----|
| **Births** | Simple % multiplier to baseline | ASFR-based calculation per age group |
| **Fertility Slider** | Multiplies all births equally | Adjusts ASFR, births respond to population structure |
| **Mortality** | Single global rate | Age-specific rates for each cohort |
| **Migration** | Global multiplier | Age-gender proportional distribution |
| **Aging** | No cohort aging | Cohorts age forward each year |
| **Oldest Cohort** | Lost each iteration | Properly ages out with mortality applied |
| **Cascading Effects** | No dynamic effects | Birth surplus creates future population growth |
| **Realism** | Basic approximation | Demographic best practices |

## Assumptions & Limitations

1. **Fixed ASFR pattern:** Uses 2023-2024 age distribution of fertility. Real patterns shift over time (e.g., delayed childbearing).

2. **Fixed migration distribution:** Uses 2024/2025 patterns. Real migration flows change with economic conditions and policy.

3. **No policy changes:** Assumes scenarios continue indefinitely (no changing immigration policy, pension age, etc.)

4. **Population closed except for migration:** No internal migration between provinces.

5. **No partnership/marriage modeling:** Births estimated from total reproductive-age females, not partnerships.

6. **No education/income effects:** Fertility doesn't vary by socioeconomic status.

7. **Constant mortality rates by age:** Real improvements in mortality occur (especially at older ages).

## Data Sources

- **Fertility rates:** Statistics Canada, 2023-2024 age-specific fertility rates
- **Mortality rates:** Statistics Canada Table 13-10-038, 2023 data by age and sex
- **Migration patterns:** Statistics Canada, 2024/2025 fiscal year by age and sex
- **Base population:** 2025 observed pyramid from census data

## Validation

The model can be validated by:

1. **2026 projection with 0% scenarios** should show growth driven by natural increase + net migration (~1.7% annual growth for Canada)

2. **Cohort survival rates** should be reasonable:
   - Ages 0-4: ~99.2% survival (very low mortality)
   - Ages 65-69: ~98.5% survival
   - Ages 80-84: ~96% survival

3. **Global mortality rate** should match official statistics (~7-8 per 1000 for Canada)

4. **Births sensitivity:** Adjusting fertility slider by +10% should increase births proportionally across all reproductive ages

5. **Population structure:** Over 50 years, population should shift toward older ages (aging effect)

## Example Calculations

### Birth Calculation with ASFR

For year N:
- Women ages 25-29: 2,500,000
- ASFR for ages 25-29: 0.06375
- Births from this group: 2,500,000 × 0.06375 = 159,375

Repeat for all reproductive age groups and sum.

### Fertility Slider Impact

With fertility at +20%:
- Adjusted ASFR for 25-29: 0.06375 × 1.20 = 0.0765
- Births from same group: 2,500,000 × 0.0765 = 191,250
- 20% more births (proportional to adjustment)

### Mortality & Aging

For cohort aged 40-44 in year N:
- Population: 1,800,000
- Base mortality rate: 0.8 per 1000
- With mortality adjustment 0%: 0.8 per 1000
- Mortality proportion: 0.8 / 1000 = 0.0008
- Survival rate: 1 - 0.0008 = 0.9992
- Cohort in year N+1 (ages 45-49): 1,800,000 × 0.9992 = 1,797,600
