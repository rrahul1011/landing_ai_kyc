class HardRejectionRule:
    """
    Deterministic 'hard-fail' checks. Keep config in YAML.
    """
    def __init__(self, cfg: dict):
        self.cfg = cfg

    def evaluate(self, kpis: KPIs, metrics: LoanMetrics, fraud: FraudSignals) -> RuleResult:
        reasons = []

        if metrics.fico_mid < self.cfg["min_fico"]:
            reasons.append(f"FICO below {self.cfg['min_fico']}")
        if kpis.back_end_dti > self.cfg["max_dti"]:
            reasons.append(f"DTI>{self.cfg['max_dti']:.0%}")
        if kpis.ltv > self.cfg["max_ltv"]:
            reasons.append(f"LTV>{self.cfg['max_ltv']:.0%}")
        if kpis.reserve_months < self.cfg["min_reserves"]:
            reasons.append(f"Reserves<{self.cfg['min_reserves']} months")
        if fraud.score >= self.cfg["fraud_fail_score"]:
            reasons.append("High fraud risk")
        # Add delinquency, bankruptcy, etc. as needed

        return RuleResult(passed=(len(reasons) == 0), reasons=reasons)