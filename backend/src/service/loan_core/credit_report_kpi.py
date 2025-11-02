from typing import Optional, Dict, Any


def _to_float(val: Optional[str]) -> Optional[float]:
    """
    Convert string value to float, handling common formatting.
    
    Args:
        val: String value that may contain commas, dollar signs, etc.
    
    Returns:
        Float value or None if conversion fails
    """
    if not val:
        return None
    try:
        # Remove common formatting characters
        cleaned = val.replace(",", "").replace("$", "").replace(" ", "").strip()
        return float(cleaned)
    except (ValueError, AttributeError):
        return None


def _to_int(val: Optional[str]) -> Optional[int]:
    """
    Convert string value to integer.
    
    Args:
        val: String value to convert
    
    Returns:
        Integer value or None if conversion fails
    """
    if not val:
        return None
    try:
        cleaned = val.replace(",", "").replace(" ", "").strip()
        return int(float(cleaned))  # Convert via float to handle decimals
    except (ValueError, AttributeError):
        return None


def _has_delinquency(delinquencies_str: Optional[str]) -> Optional[bool]:
    """
    Check if delinquencies/defaults/collections are present.
    
    Args:
        delinquencies_str: String describing delinquencies
    
    Returns:
        True if delinquencies found, False if explicitly none, None if unknown
    """
    if not delinquencies_str or not delinquencies_str.strip():
        return None
    
    s = delinquencies_str.lower().strip()
    
    # Check for explicit "none" or "no" indicators
    none_indicators = ["none", "no", "nil", "zero", "0", "n/a", "na"]
    if any(indicator in s for indicator in none_indicators):
        return False
    
    # Check for presence of delinquencies
    delinquency_indicators = [
        "delinquent", "delinquency", "default", "collection", 
        "overdue", "late payment", "past due", "charge-off"
    ]
    
    if any(indicator in s for indicator in delinquency_indicators):
        return True
    
    return None


def _has_bankruptcy(bankruptcy_str: Optional[str]) -> Optional[bool]:
    """
    Check if bankruptcy history is present.
    
    Args:
        bankruptcy_str: String describing bankruptcy history
    
    Returns:
        True if bankruptcy found, False if explicitly none, None if unknown
    """
    if not bankruptcy_str or not bankruptcy_str.strip():
        return None
    
    s = bankruptcy_str.lower().strip()
    
    # Check for explicit "none" or "no" indicators
    none_indicators = ["none", "no", "nil", "zero", "0", "n/a", "na"]
    if any(indicator in s for indicator in none_indicators):
        return False
    
    # Check for bankruptcy indicators
    bankruptcy_indicators = [
        "bankruptcy", "chapter 7", "chapter 11", "chapter 13",
        "filed", "discharged", "foreclosure"
    ]
    
    if any(indicator in s for indicator in bankruptcy_indicators):
        return True
    
    return None


def calculate_credit_report_kpis(
    credit_report: Dict[str, str],
    monthly_income: Optional[float] = None
) -> Dict[str, Any]:
    """
    Calculate all credit report KPIs from a credit report document.
    
    Args:
        credit_report: Dictionary containing credit report fields:
            - credit_score: Credit score (FICO)
            - total_debt: Total outstanding debt
            - open_credit_lines: Number of open credit lines
            - monthly_debt_payments: Total monthly debt payments
            - delinquencies_defaults_collections: Summary of delinquencies
            - bankruptcy_history: Bankruptcy history details
            - hard_inquiries_last_12_months: Number of hard inquiries
        monthly_income: Optional monthly income for DTI calculation
    
    Returns:
        Dictionary containing calculated KPIs:
            - credit_score: Parsed credit score as integer
            - total_debt: Total debt as float
            - open_credit_lines: Number of open credit lines as integer
            - monthly_debt_payments: Monthly debt payments as float
            - debt_to_income_ratio: DTI ratio (if monthly_income provided)
            - has_delinquencies: Boolean indicating presence of delinquencies
            - has_bankruptcy: Boolean indicating bankruptcy history
            - hard_inquiries_count: Number of hard inquiries as integer
            - credit_health_score: Categorical score ("excellent", "good", "fair", "poor", "unknown")
    """
    credit_score_str = credit_report.get("credit_score")
    total_debt_str = credit_report.get("total_debt")
    open_credit_lines_str = credit_report.get("open_credit_lines")
    monthly_debt_payments_str = credit_report.get("monthly_debt_payments")
    delinquencies_str = credit_report.get("delinquencies_defaults_collections")
    bankruptcy_str = credit_report.get("bankruptcy_history")
    hard_inquiries_str = credit_report.get("hard_inquiries_last_12_months")
    
    # Parse numeric values
    credit_score = _to_int(credit_score_str)
    total_debt = _to_float(total_debt_str)
    open_credit_lines = _to_int(open_credit_lines_str)
    monthly_debt_payments = _to_float(monthly_debt_payments_str)
    hard_inquiries_count = _to_int(hard_inquiries_str)
    
    # Check for delinquencies and bankruptcy
    has_delinquencies = _has_delinquency(delinquencies_str)
    has_bankruptcy = _has_bankruptcy(bankruptcy_str)
    
    # Calculate debt-to-income ratio if monthly income is provided
    debt_to_income_ratio = None
    if monthly_income and monthly_income > 0 and monthly_debt_payments:
        debt_to_income_ratio = round(monthly_debt_payments / monthly_income, 4)
    
    # Calculate credit health score based on credit score
    credit_health_score = "unknown"
    if credit_score is not None:
        if credit_score >= 750:
            credit_health_score = "excellent"
        elif credit_score >= 700:
            credit_health_score = "good"
        elif credit_score >= 650:
            credit_health_score = "fair"
        else:
            credit_health_score = "poor"
    
    return {
        "credit_score": credit_score,
        "total_debt": round(total_debt, 2) if total_debt is not None else None,
        "open_credit_lines": open_credit_lines,
        "monthly_debt_payments": round(monthly_debt_payments, 2) if monthly_debt_payments is not None else None,
        "debt_to_income_ratio": debt_to_income_ratio,
        "has_delinquencies": has_delinquencies,
        "has_bankruptcy": has_bankruptcy,
        "hard_inquiries_count": hard_inquiries_count,
        "credit_health_score": credit_health_score,
    }

