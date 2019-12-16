class SomeClass {
  // removedField is removed
  public visibilityChangedField: Namespace.Type;
  private readOnlyRemovedField = "stuff";

  // removedMethod is removed
  changedParamType(firstParam: number): void {}
  changedReturnType(firstParam: string): number {
    return 311;
  }
  reorderedParams(secondParam: string, firstParam: string): void {}
}

interface SomeInterface {}
class DifferentBaseClass {}

export class ExportedClass extends DifferentBaseClass
  implements SomeInterface {}
