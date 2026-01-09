export function schedulePublishedTemplate(params: {
  ministryName: string;
  month: number;
  year: number;
}) {
  return {
    title: "📅 Escala publicada",
    body: `A escala do ministério ${params.ministryName} para ${params.month}/${params.year} já está disponível.`,
  };
}

export function generalSchedulePublishedTemplate(params: {
  month: number;
  year: number;
}) {
  return {
    title: "📢 Escala geral publicada",
    body: `As escalas de ${params.month}/${params.year} já foram publicadas.`,
  };
}
