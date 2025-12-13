// ORIGINAL: function



  normalizePath(brand: string, model: string): string {
    return pathModule.join(
      CONFIG.PATHS.CONTENT,
      `${brand}_${model}`.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-_.]/g, ""),
    );
  }
