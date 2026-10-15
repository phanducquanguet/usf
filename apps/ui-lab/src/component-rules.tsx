import { useTranslation } from "react-i18next";
import { Markdown } from "@multica/ui/markdown";
import { Button } from "@multica/ui/components/ui/button";
import buttonEn from "@multica/ui/docs/button.md?raw";
import dialogEn from "@multica/ui/docs/dialog.md?raw";

const rules = {
  button: buttonEn,
  dialog: dialogEn,
};

export function ComponentRules({
  component,
}: {
  component: keyof typeof rules;
}) {
  const { t } = useTranslation("uiLab");
  // Component rules are maintained in English only.
  const content = rules[component];
  return (
    <details className="component-rules">
      <summary>{t(($) => $.rules.content.title)}</summary>
      <div className="rules-source">
        <code>
          packages/ui/docs/{component}.md
        </code>
        <Button
          variant="outline"
          size="sm"
          render={
            <a
              href={`data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`}
              download={`${component}.md`}
            />
          }
        >
          {t(($) => $.rules.content.download)}
        </Button>
      </div>
      <Markdown mode="full">{content}</Markdown>
    </details>
  );
}
