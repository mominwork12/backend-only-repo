import UseCaseLanding from "@/components/marketing/UseCaseLanding";

export default function EducationCaptionsPage() {
  return (
    <UseCaseLanding
      title="Education Captions For Better Retention"
      subtitle="Make lessons easier to follow with clean subtitles and accessibility-first styles."
      bullets={[
        "Dyslexia-friendly and high-contrast presets.",
        "Auto subtitle cleanup before render.",
        "Structured pacing for step-by-step explanations.",
      ]}
    />
  );
}
