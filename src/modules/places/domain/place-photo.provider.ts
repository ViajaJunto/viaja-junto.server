/**
 * Port to a source of photos for a place, used when the places provider did
 * not give one. Abstract class so Nest can use it as a DI token.
 */
export abstract class PlacePhotoProvider {
  /** A public URL of a photo of the place with this name, or null when there is none. */
  abstract find(name: string): Promise<string | null>;
}
