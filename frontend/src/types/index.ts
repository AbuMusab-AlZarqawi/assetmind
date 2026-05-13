export type AssetCategoryEnum = 0 | 1 | 2 | 3 | 4;

export interface Asset {
  id:                bigint;
  owner:             `0x${string}`;
  name:              string;
  description:       string;
  location:          string;
  category:          AssetCategoryEnum;
  estimatedValue:    bigint;
  aiValuation:       bigint;
  riskScore:         number;
  aiReport:          string;
  valuationComplete: boolean;
  sharesSupply:      bigint;
  submittedAt:       bigint;
}

export interface SubmitAssetForm {
  name:           string;
  description:    string;
  location:       string;
  category:       AssetCategoryEnum;
  estimatedValue: string; // USD string, converted to cents on submit
}
