class SomeClass {
  // removedField is removed
  public visibilityChangedField: Namespace.Type;
  private readOnlyRemovedField = "stuff";

  // removedMethod is removed
  changedParamType(firstParam: number): void {}
  changedReturnType(firstParam: string): number {
    return 311;
  }
}

interface SomeInterface {}
class DifferentBaseClass {}

export class ExportedClass extends DifferentBaseClass
  implements SomeInterface {}
