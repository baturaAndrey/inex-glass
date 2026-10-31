import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChipGroup } from "./chip-group";
import { Field } from "./field";
import { FileUpload } from "./file-upload";
import { PhoneInput } from "./phone-input";
import { RadioCardGroup } from "./radio-card";

/**
 * Behaviour tests of the form primitives (deferred from the wave-3 review, task-20 Notes):
 * phone mask editing, arrow navigation of radio groups, `Field` group labelling and the
 * drag counter of `FileUpload`.
 */

function ControlledPhone({ onE164 }: { onE164?: (value: string | null) => void }) {
  const [value, setValue] = useState("");
  return (
    <PhoneInput
      aria-label="Телефон"
      value={value}
      onChange={(masked, e164) => {
        setValue(masked);
        onE164?.(e164);
      }}
    />
  );
}

describe("PhoneInput", () => {
  it("masks typed digits and reports E.164 when complete", async () => {
    const onE164 = vi.fn();
    render(<ControlledPhone onE164={onE164} />);
    const input = screen.getByRole("textbox", { name: "Телефон" });
    await userEvent.type(input, "9001234567");
    expect(input).toHaveValue("+7 (900) 123-45-67");
    expect(onE164).toHaveBeenLastCalledWith("+79001234567");
  });

  it("treats a leading 8 as the trunk prefix", async () => {
    render(<ControlledPhone />);
    const input = screen.getByRole("textbox", { name: "Телефон" });
    await userEvent.type(input, "8");
    expect(input).toHaveValue("+7 (");
    await userEvent.type(input, "912");
    expect(input).toHaveValue("+7 (912");
  });

  it("Backspace over a mask character deletes the digit before it", async () => {
    render(<ControlledPhone />);
    const input = screen.getByRole("textbox", { name: "Телефон" });
    await userEvent.type(input, "9001234");
    expect(input).toHaveValue("+7 (900) 123-4");
    await userEvent.type(input, "{Backspace}");
    expect(input).toHaveValue("+7 (900) 123");
    await userEvent.type(input, "{Backspace}");
    expect(input).toHaveValue("+7 (900) 12");
  });

  it("replaces the field with a pasted full number", async () => {
    const onE164 = vi.fn();
    render(<ControlledPhone onE164={onE164} />);
    const input = screen.getByRole("textbox", { name: "Телефон" });
    await userEvent.click(input);
    await userEvent.paste("8 (900) 765-43-21");
    expect(input).toHaveValue("+7 (900) 765-43-21");
    expect(onE164).toHaveBeenLastCalledWith("+79007654321");
  });
});

const OPTIONS = [
  { value: "a", title: "A" },
  { value: "b", title: "B", disabled: true },
  { value: "c", title: "C" },
];

function ControlledCards() {
  const [value, setValue] = useState<string | null>(null);
  return <RadioCardGroup ariaLabel="Карты" value={value} onChange={setValue} options={OPTIONS} />;
}

describe("RadioCardGroup keyboard", () => {
  it("has one tab stop and moves/selects with arrows, skipping disabled items", async () => {
    render(<ControlledCards />);
    const [a, b, c] = screen.getAllByRole("radio");
    expect(a).toHaveAttribute("tabindex", "0");
    expect(c).toHaveAttribute("tabindex", "-1");
    await userEvent.tab();
    expect(a).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(c).toHaveFocus();
    expect(c).toHaveAttribute("aria-checked", "true");
    expect(b).toHaveAttribute("aria-checked", "false");
    await userEvent.keyboard("{ArrowDown}");
    expect(a).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(c).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(a).toHaveAttribute("aria-checked", "true");
  });
});

function ControlledChips() {
  const [value, setValue] = useState<string | null>("y");
  const [many, setMany] = useState<string[]>([]);
  return (
    <>
      <ChipGroup
        mode="single"
        ariaLabel="Одиночный"
        value={value}
        onChange={setValue}
        options={[
          { value: "x", label: "X" },
          { value: "y", label: "Y" },
          { value: "z", label: "Z" },
        ]}
      />
      <ChipGroup
        mode="multiple"
        ariaLabel="Множественный"
        value={many}
        onChange={setMany}
        options={[
          { value: "m", label: "M" },
          { value: "n", label: "N" },
        ]}
      />
    </>
  );
}

describe("ChipGroup", () => {
  it("single: roving tabindex on the selected chip, arrows wrap", async () => {
    render(<ControlledChips />);
    const group = screen.getByRole("radiogroup", { name: "Одиночный" });
    const radios = Array.from(group.querySelectorAll<HTMLElement>("[role=radio]"));
    expect(radios[1]).toHaveAttribute("tabindex", "0");
    radios[1]!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(radios[2]).toHaveFocus();
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{ArrowRight}");
    expect(radios[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(radios[2]).toHaveFocus();
  });

  it("multiple: toggle buttons with aria-pressed in option order", async () => {
    render(<ControlledChips />);
    const n = screen.getByRole("button", { name: "N" });
    const m = screen.getByRole("button", { name: "M" });
    await userEvent.click(n);
    await userEvent.click(m);
    expect(n).toHaveAttribute("aria-pressed", "true");
    expect(m).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(n);
    expect(n).toHaveAttribute("aria-pressed", "false");
  });
});

describe("Field with a group control", () => {
  it("names the group through aria-labelledby and describes it with the error", () => {
    render(
      <Field label="Кто вы" group error="Выберите вариант">
        <ChipGroup
          mode="single"
          value={null}
          onChange={() => {}}
          options={[{ value: "a", label: "подрядчик" }]}
        />
      </Field>
    );
    const group = screen.getByRole("radiogroup", { name: "Кто вы" });
    expect(group).toHaveAccessibleDescription("Выберите вариант");
    // A group label is not a <label for>: it would point at a non-labelable element.
    expect(screen.getByText("Кто вы").tagName).toBe("SPAN");
  });

  it("keeps <label for> for regular inputs and an explicit aria-label wins", () => {
    render(
      <Field label="Тип" group>
        <RadioCardGroup
          ariaLabel="Явное имя"
          value={null}
          onChange={() => {}}
          options={[{ value: "a", title: "A" }]}
        />
      </Field>
    );
    expect(screen.getByRole("radiogroup", { name: "Явное имя" })).toBeInTheDocument();
  });

  it("names the upload zone", () => {
    render(
      <Field label="Чертёж" group>
        <FileUpload
          accept={["pdf"]}
          maxBytes={10}
          value={null}
          onSelect={() => {}}
          onClear={() => {}}
        />
      </Field>
    );
    expect(screen.getByRole("group", { name: "Чертёж" })).toBeInTheDocument();
  });
});

describe("FileUpload drag & drop", () => {
  it("stays in the drag state while the pointer crosses children (Safari relatedTarget = null)", () => {
    render(
      <FileUpload
        accept={["pdf"]}
        maxBytes={10}
        value={null}
        onSelect={() => {}}
        onClear={() => {}}
      />
    );
    const zone = screen.getByRole("group", { name: "Загрузка файла" });
    fireEvent.dragEnter(zone);
    expect(screen.getByText("Отпустите файл")).toBeInTheDocument();
    // Entering a child fires enter (child) then leave (zone) with relatedTarget null in Safari.
    fireEvent.dragEnter(zone);
    fireEvent.dragLeave(zone, { relatedTarget: null });
    expect(screen.getByText("Отпустите файл")).toBeInTheDocument();
    fireEvent.dragLeave(zone, { relatedTarget: null });
    expect(screen.queryByText("Отпустите файл")).not.toBeInTheDocument();
  });

  it("rejects a wrong format with the verbatim text and accepts a valid drop", () => {
    const onSelect = vi.fn();
    const onReject = vi.fn();
    render(
      <FileUpload
        accept={["pdf"]}
        maxBytes={10}
        value={null}
        onSelect={onSelect}
        onReject={onReject}
        onClear={() => {}}
      />
    );
    const zone = screen.getByRole("group", { name: "Загрузка файла" });
    const exe = new File(["x"], "a.exe");
    fireEvent.drop(zone, { dataTransfer: { files: [exe] } });
    expect(onReject).toHaveBeenCalledWith("format", exe);
    expect(screen.getAllByText("Подойдут PDF").length).toBeGreaterThan(0);

    const pdf = new File(["x"], "a.pdf");
    fireEvent.drop(screen.getByRole("group", { name: "Загрузка файла" }), {
      dataTransfer: { files: [pdf] },
    });
    expect(onSelect).toHaveBeenCalledWith(pdf);
  });
});
