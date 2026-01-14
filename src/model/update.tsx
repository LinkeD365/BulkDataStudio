import { makeAutoObservable } from "mobx";
import { Field, SelectionValue } from "./viewModel";

export class UpdateField {
  field: Field;
  newValue?: any;
  selectedValues?: string[] = [];
  setStatus: string = "Fixed";
  onlyDifferent: boolean = false;
  selectionValues?: SelectionValue[] = [];

  constructor(field: Field) {
    this.field = field;
    makeAutoObservable(this);
  }
}

export const SetStatus: string[] = ["Fixed", "Calculate", "Touch", "Set Null"];
