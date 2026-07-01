export type ErVisitLookup = {
  success: boolean;
  erttbkey?: string;
  ercaseno?: string;
  erdhist?: string;
  docid?: string;
  error?: string;
};

export {
  normalizeErdhist,
  normalizeErcaseno,
  normalizeErsdinpn,
  displayErcaseno,
  formatErsSaveError,
  ERS_VALIDATION_FAIL_MSG,
} from "@/lib/utils/ersFormat";
