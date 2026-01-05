// ✅ Método simple y confiable
export async function listarMallas() {
  const universidades = [
    {
      universidad: "Universidad de Chile",
      mallas: [
        {
          nombre: "Bioquímica",
          url: "/mallas/BQ.json",
        },
        {
          nombre: "Química y Farmacia",
          url: "/mallas/QYF.json",
        },
      ],
    },
  ];

  return universidades;
}
