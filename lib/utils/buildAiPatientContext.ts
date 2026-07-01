export type PatientDemographics = {
  sex: string;
  age: string | number;
};

export function buildPatientSystemPrompt({ sex, age }: PatientDemographics): string {
  const ageLabel = age === "" || age === undefined || age === null ? "未知" : `${age}歲`;
  return `【病患基本資料】性別：${sex || "未知"}，年齡：${ageLabel}`;
}

export function buildAiMessageWithPatient(
  contextData: unknown,
  demographics: PatientDemographics
): string {
  const payload =
    typeof contextData === "object" && contextData !== null && !Array.isArray(contextData)
      ? { 性別: demographics.sex, 年齡: demographics.age, ...contextData }
      : { 性別: demographics.sex, 年齡: demographics.age, 內容: contextData };

  return JSON.stringify(payload);
}
