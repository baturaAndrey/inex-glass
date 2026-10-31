import { StrictMode } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ContractDialog, RefuseDialog } from "./move-dialogs";

/**
 * jsdom has no `showModal`/`close`; these follow the browser closely enough for the dialogs:
 * `close()` drops `open` at once and dispatches `close` as a separate task (not synchronously),
 * which is what made a Strict Mode remount close the dialog it had just reopened.
 */
const dialogProto = HTMLDialogElement.prototype;
const original = { showModal: dialogProto.showModal, close: dialogProto.close };

beforeAll(() => {
  dialogProto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  dialogProto.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    setTimeout(() => this.dispatchEvent(new Event("close")), 0);
  };
});

afterAll(() => {
  dialogProto.showModal = original.showModal;
  dialogProto.close = original.close;
});

/** Lets the queued `close` tasks run. */
const flushTasks = () => act(() => new Promise((resolve) => setTimeout(resolve, 10)));

const REASONS = [{ value: "expensive", label: "Дорого" }];

describe("RefuseDialog", () => {
  it("stays open in Strict Mode (the effect's cleanup close does not unmount it)", async () => {
    const onClose = vi.fn();
    render(
      <StrictMode>
        <RefuseDialog
          cardTitle="ООО «Тест»"
          reasonOptions={REASONS}
          onSubmit={vi.fn()}
          onClose={onClose}
        />
      </StrictMode>
    );
    await flushTasks();

    expect(screen.getByRole("dialog", { name: "Закрыть заявку «ООО «Тест»»" })).toHaveAttribute(
      "open"
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose once on «Отмена»", async () => {
    const onClose = vi.fn();
    render(
      <StrictMode>
        <RefuseDialog
          cardTitle="Тест"
          reasonOptions={REASONS}
          onSubmit={vi.fn()}
          onClose={onClose}
        />
      </StrictMode>
    );
    await flushTasks();

    await userEvent.click(screen.getByRole("button", { name: "Отмена" }));
    await flushTasks();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("submits the chosen reason", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    render(
      <StrictMode>
        <RefuseDialog
          cardTitle="Тест"
          reasonOptions={REASONS}
          onSubmit={onSubmit}
          onClose={vi.fn()}
        />
      </StrictMode>
    );
    await flushTasks();

    await userEvent.selectOptions(screen.getByLabelText("Причина"), "expensive");
    await userEvent.click(screen.getByRole("button", { name: "Закрыть заявку" }));

    expect(onSubmit).toHaveBeenCalledWith({ refuseReasonCode: "expensive" });
  });
});

describe("ContractDialog", () => {
  it("stays open in Strict Mode and closes on «Отмена»", async () => {
    const onClose = vi.fn();
    render(
      <StrictMode>
        <ContractDialog
          cardTitle="Тест"
          statusName="Договор"
          onConfirm={vi.fn()}
          onClose={onClose}
        />
      </StrictMode>
    );
    await flushTasks();

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Отмена" }));
    await flushTasks();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
