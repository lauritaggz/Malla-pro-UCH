// ✅ Método simple y confiable
export async function listarMallas() {
  const universidades = [
    {
      universidad: "Universidad de Chile",
      mallas: [
        {
          nombre: "Quimica y Farmacia",
          url: "/mallas/QYF.json",
        },
        {
          nombre: "Bioquimica",
          url: "/mallas/BQ.json",
        },
      ],
    },
  ];

  return universidades;
}
