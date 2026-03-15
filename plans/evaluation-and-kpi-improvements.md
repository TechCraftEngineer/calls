# Plan for Improving Evaluation and KPI System

## Current State Analysis

### Strengths
1. Flexible evaluation templates per role (sales, support, general) that can be set as default or per user.
2. Evaluation includes both a value score (business outcome) and a quality score (manager's assessment).
3. Tracks call duration and direction (incoming/outgoing) for statistics.
4. KPI calculation based on measurable activity (talk time).
5. Clear evaluation sidebar in call detail modal showing scores and feedback.

### Weaknesses
1. Evaluation lacks specific criteria – only a single score with explanation, making it hard to identify improvement areas.
2. KPI is solely based on talk time, which may not reflect quality or outcomes (high talk time ≠ good performance).
3. No direct link between evaluation scores and KPI/business outcomes.
4. Statistics do not show evaluation scores aggregated by employee or over time.
5. Evaluation templates are only labels; no structured criteria definition visible in the code.
6. No trend tracking for evaluation scores or KPI over time.

## Proposed Improvements

### Based on Best Practices
- Implement a balanced scorecard: combine leading indicators (activities) and lagging indicators (outcomes).
- Evaluate both quality and outcome of work with specific, actionable feedback.
- Align individual goals with company objectives (e.g., sales conversion, customer satisfaction).
- Use data-driven decisions while considering qualitative factors.

### Alignment with Company Goals (Inferred)
- Improve sales and support performance.
- Increase customer satisfaction.
- Improve efficiency and effectiveness of calls.

### Risk Mitigation
- **Overemphasis on talk time**: Introduce quality and outcome metrics to prevent gaming (e.g., prolonging calls unnecessarily).
- **Inconsistent evaluations**: Define clear evaluation criteria per template to ensure consistency.
- **Misaligned incentives**: Link evaluation criteria to KPI so employees focus on what matters.

## Specific Metric Changes

### Metrics to Add
1. **Evaluation Criteria Scores**: Break down evaluation into specific criteria (e.g., for sales: greeting, needs identification, product presentation, handling objections, closing; for support: empathy, problem-solving, adherence to protocol). Each criterion scored 1-5 with optional comment.
2. **Quality Score Average**: Average of all evaluation criteria scores (normalized to 0-100%).
3. **Outcome Score**: Use existing `value_score` (1-5) as the business outcome metric.
4. **Activity Score**: Talk time compliance (actual vs. target) but with a target range (e.g., 80%-120% of target = 100%, outside range proportional).
5. **Composite KPI Score**: Weighted formula (e.g., 40% activity, 30% quality, 30% outcome) to calculate KPI completion percentage.
6. **Trend Metrics**: Monthly average evaluation criteria scores and KPI scores per employee.

### Metrics to Change
1. **KPI Calculation**: Shift from pure talk time percentage to a weighted composite score incorporating activity, quality, and outcome.
2. **Evaluation Display**: Show criterion-by-criterion breakdown in the evaluation sidebar and statistics instead of just a single manager score.
3. **Statistics View**: Add score distribution by evaluation criteria (not just overall value score) and show trends over time.

### Metrics to Remove
- None to remove, but consider deprecating the standalone `manager_score` field in favor of the average of criterion scores (keeping it for backward compatibility).

## Implementation Plan

### Phase 1: Evaluation Template Enhancement
- **Goal**: Allow defining specific criteria per evaluation template.
- **Changes**:
  - Extend the evaluation template storage (in `prompts` table or new table) to include criteria definition (name, description, weight optional).
  - Update evaluation settings page UI to manage criteria per template (add, edit, reorder, delete criteria).
  - Update backend ORPC procedures (`get-evaluation-templates`, `update-evaluation-settings`) to handle criteria.
- **Files to modify**:
  - `packages/api/src/routers/settings/get-evaluation-templates.ts`
  - `packages/api/src/routers/settings/update-evaluation-settings.ts`
  - `packages/db/src/schema/prompts.ts` (or new schema file)
  - `apps/app/src/app/settings/evaluation/page.tsx`
  - `packages/db/src/repositories/prompts.repository.ts` (if needed)

### Phase 2: Evaluation Breakdown Storage and Display
- **Goal**: Store and display criterion-specific scores.
- **Changes**:
  - Use existing `managerBreakdown` JSONB field in `call_evaluations` table to store criterion scores (e.g., `{"greeting": 4, "needs_identification": 5, ...}`).
  - Update evaluation process (AI or manager) to populate `managerBreakdown` with criterion scores.
  - Update frontend to display criterion scores in evaluation sidebar (call detail modal) and in statistics.
  - Update statistics aggregation to calculate average per criterion.
- **Files to modify**:
  - `packages/db/src/services/calls.service.ts` (in `addEvaluation`)
  - `packages/db/src/repositories/calls.repository.ts` (in `addEvaluation`)
  - `packages/jobs/src/evaluation/evaluate-call.ts` (AI evaluation logic)
  - `packages/jobs/src/inngest/functions/evaluate-call.ts` (if applicable)
  - `apps/app/src/components/features/calls/call-detail-modal/evaluation-sidebar.tsx`
  - `apps/app/src/app/statistics/statistics-table.tsx`
  - `packages/db/src/repositories/calls/get-evaluations-stats.ts` (to include criteria averages)

### Phase 3: KPI Formula Update
- **Goal**: Implement weighted KPI formula.
- **Changes**:
  - Define weights (e.g., activity 40%, quality 30%, outcome 30%) – make configurable per workspace or role.
  - Calculate activity score: `min(actual_talk_time / target_talk_time, 1.0) * 100` (or use range-based scoring).
  - Quality score: average of evaluation criteria scores (normalized to 0-100%).
  - Outcome score: `value_score * 20` (to convert 1-5 to 0-100).
  - Composite KPI = (activity_score * 0.4) + (quality_score * 0.3) + (outcome_score * 0.3).
  - Update KPI backend calculation (likely in a new or existing KPI service).
  - Update KPI frontend to display the new KPI completion percentage and calculated bonus.
- **Files to modify**:
  - `packages/api/src/routers/statistics/get-metrics.ts` (or new KPI router)
  - `packages/db/src/services/calls.service.ts` (add KPI calculation method)
  - `packages/db/src/repositories/calls/repository.ts` (if needed)
  - `apps/app/src/components/features/calls/kpi-table.tsx`
  - `apps/app/src/components/features/users/edit-user-modal/kpi-filter-section.tsx` (if KPI settings are exposed)
  - `apps/app/src/app/statistics/page.tsx` (to show KPI tab with new metrics)

### Phase 4: Statistics and Reporting Updates
- **Goal**: Enhance statistics to show evaluation trends and KPI details.
- **Changes**:
  - Add trend charts (e.g., line charts) for evaluation criteria scores over time per employee.
  - Show correlation between evaluation scores and KPI/score outcomes.
  - Allow filtering by evaluation template or criteria in statistics.
  - Export options for evaluation and KPI reports.
- **Files to modify**:
  - `apps/app/src/app/statistics/statistics-table.tsx` (add charts using a library like Recharts or Victory)
  - `apps/app/src/app/statistics/statistics-filters.tsx` (add new filter options)
  - `packages/api/src/routers/statistics/get-statistics.ts` (to include trend data)
  - `packages/db/src/repositories/calls/get-evaluations-stats.ts` (to support time-series aggregation)

### Phase 5: UI Updates
- **Goal**: Ensure consistent and intuitive user experience across all changes.
- **Changes**:
  - Update evaluation settings page to manage criteria.
  - Update user edit modal to show evaluation criteria defaults or allow overrides.
  - Update call list to show criterion-specific scores (maybe as hover detail).
  - Update evaluation sidebar to show radar bar or breakdown chart.
  - Add tooltips and explanations for new metrics.
- **Files to modify**:
  - All UI files mentioned in previous phases.
  - Consider adding a new component for evaluation breakdown visualization (e.g., radar chart or bar chart).

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Increased complexity in evaluation process | Provide clear criteria definitions and training; start with a pilot group. |
| Resistance to change from employees | Communicate benefits; involve employees in criteria design; ensure transparency. |
| Data inconsistency during transition | Run old and new systems in parallel temporarily; validate data before full switch. |
| AI evaluation accuracy with new criteria | Fine-tune AI prompts; use human-in-the-loop for validation initially. |
| KPI formula weights not optimal | Start with default weights; allow adjustment based on feedback and correlation analysis. |

## Success Metrics
- Increase in average evaluation criteria scores over time (target: +10% in 6 months).
- Improvement in business outcomes (e.g., conversion rate, customer satisfaction) correlated with higher evaluation scores.
- Reduction in KPI gaming behaviors (e.g., abnormal talk time spikes).
- Employee satisfaction with evaluation process (measured via internal survey).
- Manager time saved on evaluations due to clearer criteria and structured feedback.

## Next Steps
1. Review and approve this plan.
2. Switch to Code mode to begin implementation (starting with Phase 1).
3. Iteratively implement each phase, validating with stakeholders.
4. After each phase, update the plan based on learnings and feedback.
