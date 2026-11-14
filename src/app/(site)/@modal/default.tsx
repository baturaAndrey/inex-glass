/**
 * `@modal` slot fallback (task-34): nothing on a hard navigation / reload, so only a client
 * navigation to `/raschet-stoimosti/` (intercepted by `(.)raschet-stoimosti`) shows the modal.
 */
export default function Default() {
  return null;
}
