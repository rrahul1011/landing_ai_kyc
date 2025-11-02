from typing import Optional, Dict

FREQ_FACTORS = {
    "weekly": 4.333,
    "biweekly": 2.167,
    "semi-monthly": 2,
    "semimonthly": 2,
    "monthly": 1
}

def _to_float(val: Optional[str]) -> Optional[float]:
    if not val:
        return None
    try:
        return float(val.replace(",", "").replace("$", "").strip())
    except:
        return None

def infer_frequency(pay_period: Optional[str]) -> Optional[str]:
    if not pay_period:
        return None
    s = pay_period.lower()
    if "weekly" in s and "bi" not in s:
        return "weekly"
    if "biweekly" in s or "bi-weekly" in s:
        return "biweekly"
    if "semi-monthly" in s or "semimonthly" in s or "twice a month" in s:
        return "semi-monthly"
    if "monthly" in s:
        return "monthly"
    return None

def calculate_paystub_income_kpis(paystub: Dict[str, str]):
    gross_pay = _to_float(paystub.get("gross_pay"))
    net_pay = _to_float(paystub.get("net_pay"))
    freq = infer_frequency(paystub.get("pay_period"))
    factor = FREQ_FACTORS.get(freq)

    gross_monthly = gross_pay * factor if (gross_pay and factor) else None
    net_monthly = net_pay * factor if (net_pay and factor) else None
    annualized_gross = gross_monthly * 12 if gross_monthly else None

    return {
        "gross_monthly_income": round(gross_monthly, 2) if gross_monthly else None,
        "net_monthly_income": round(net_monthly, 2) if net_monthly else None,
        "annualized_gross_income": round(annualized_gross, 2) if annualized_gross else None
    }
