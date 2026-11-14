"use client";

import { FileUpload } from "@/components/ig/file-upload";
import { ALLOWED_QUIZ_EXT, MAX_UPLOAD_BYTES } from "@/lib/client/upload-file";
import { STEP_TITLES } from "../options";
import { QuizHint } from "../quiz-hint";
import { StepSub, StepTitle, type QuizStepProps } from "./parts";

export const FILE_LEAD_TITLE = "Прикрепите файл";
export const FILE_LEAD_TEXT = "— DWG, DXF, PDF или фото эскиза, до 50 МБ.";
export const FILE_HINT_TEXT =
  "Для простых прямоугольных стёкол подойдёт PDF или эскиз. Сложную форму — контуром в DWG или DXF 1:1";
export const NO_FILE_LINK_TEXT = "Нет чертежа? Продолжите — менеджер уточнит размеры";

/**
 * Step 5 «Чертёж»: drag & drop / browse, local format and size checks inside `FileUpload`,
 * streaming upload with progress (`uploadFile`). «Нет чертежа?» moves on with the `no_file` flag.
 */
export function Step5File({ q, fieldId, titleId }: QuizStepProps) {
  const file = q.state.answers.file;
  const leadId = fieldId("file-lead");

  return (
    <>
      <StepTitle id={titleId}>{STEP_TITLES[5]}</StepTitle>
      <StepSub id={leadId} className="font-normal">
        <strong className="font-semibold">{FILE_LEAD_TITLE}</strong> {FILE_LEAD_TEXT}
      </StepSub>
      <div role="group" aria-labelledby={leadId}>
        <FileUpload
          id={fieldId("file")}
          accept={ALLOWED_QUIZ_EXT}
          maxBytes={MAX_UPLOAD_BYTES}
          value={file ? { name: file.name, size: file.size } : null}
          uploading={q.uploading}
          error={q.uploadError}
          onSelect={(selected) => void q.selectFile(selected)}
          onClear={q.clearFile}
          onReject={() => q.setUploadError(null)}
        />
      </div>
      <QuizHint variant="info">{FILE_HINT_TEXT}</QuizHint>
      <button type="button" className="ig-link self-start text-left" onClick={q.skipFile}>
        {NO_FILE_LINK_TEXT}
      </button>
    </>
  );
}
