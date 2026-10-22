/** Placeholder of a dashboard block whose data could not be loaded (the rest still renders). */
export function BlockError() {
  return (
    <p className="iga-dash__error" role="status">
      Не удалось загрузить данные
    </p>
  );
}
