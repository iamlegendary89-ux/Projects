// ORIGINAL: function

function getThresholds(type: string) {
  const isSpecs = type.includes("specs");
  const isDxomark = type.includes("dxomark");

  if (isSpecs) {
    return {
      wordCount: { min: 500, max: 1200 },
      fileSize: { min: 3, max: 6 },
      minContentLength: 200,
    };
  }

  if (isDxomark) {
    return {
      wordCount: { min: 200, max: 1000 },
      fileSize: { min: 4, max: 12 },
      minContentLength: 200,
    };
  }

  // Review thresholds - compute max based on source
  const maxWords =
    type.includes("gsmarena") || type.includes("notebookcheck") ? 27000 :
      type.includes("techradar") ? 13500 :
        type.includes("phonearena") || type.includes("androidcentral") ? 10500 :
          type.includes("theverge") ? 9000 : 7875;

  return {
    wordCount: { min: 2000, max: maxWords },
    fileSize: { min: 12, max: 80 },
    minContentLength: 500,
  };
}
