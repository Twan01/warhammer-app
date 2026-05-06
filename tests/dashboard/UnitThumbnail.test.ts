import { describe, it } from "vitest";

describe("UnitThumbnail", () => {
  describe("PHOTO-01: photo rendering", () => {
    it.todo("renders img tag when photo is provided");
    it.todo("sets correct src from photo.assetUrl");
    it.todo("sets alt text from unit name");
    it.todo("applies object-cover and rounded-lg classes");
  });

  describe("PHOTO-02: fallback rendering", () => {
    it.todo("renders fallback div when no photo is provided");
    it.todo("renders fallback div when photo load fails (onError)");
    it.todo("uses faction color_theme as background color");
    it.todo("uses muted color when no faction provided");
    it.todo("renders Swords icon in fallback");
  });

  describe("size variants", () => {
    it.todo("renders at sm size (w-11 h-11) for compact rows");
    it.todo("renders at md size (w-20 h-20) for hero card");
  });
});
