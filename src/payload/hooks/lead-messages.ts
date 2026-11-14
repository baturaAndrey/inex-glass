/**
 * User-facing texts of the leads business rules, returned by the REST API in
 * `errors[0].data.errors[].message` of a 400 response.
 *
 * Dependency-free on purpose: the e2e suite imports these to assert the exact API response
 * without pulling Payload into the Playwright runner.
 */

/** `leads.beforeValidate` (`lead-status-validation.ts`): status «Отказ» without a reason. */
export const REFUSE_REASON_REQUIRED_MESSAGE = "Укажите причину отказа";

/** `leads.beforeChange` (`lead-comments.ts`): a manager edits or removes someone else's comment. */
export const FOREIGN_COMMENT_MESSAGE = "Чужие комментарии менять нельзя";
