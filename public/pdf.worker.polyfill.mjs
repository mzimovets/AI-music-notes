// Полифилл для Safari iOS — Map.getOrInsertComputed не поддерживается
if (!Map.prototype.getOrInsertComputed) {
  Map.prototype.getOrInsertComputed = function(key, fn) {
    if (!this.has(key)) this.set(key, fn(key));
    return this.get(key);
  };
}

import './pdf.worker.min.mjs';
