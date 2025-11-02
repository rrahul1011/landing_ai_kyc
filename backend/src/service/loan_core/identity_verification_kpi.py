from datetime import datetime
from typing import Optional, Dict, Any
import re


def _parse_date(date_str: Optional[str], formats: list = None) -> Optional[datetime]:
    """
    Parse date string with multiple format attempts.
    
    Args:
        date_str: Date string to parse
        formats: List of date formats to try (defaults to common formats)
    
    Returns:
        datetime object if parsing succeeds, None otherwise
    """
    if not date_str or not date_str.strip():
        return None
    
    if formats is None:
        formats = [
            "%Y-%m-%d",           # 2001-07-20
            "%d %b %Y",            # 20 Jul 2001
            "%d/%m/%Y",            # 20/07/2001
            "%m/%d/%Y",            # 07/20/2001
            "%Y-%m-%d %H:%M:%S",  # 2001-07-20 00:00:00
            "%d-%m-%Y",            # 20-07-2001
            "%Y/%m/%d",            # 2001/07/20
        ]
    
    date_str = date_str.strip()
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except (ValueError, TypeError):
            continue
    
    return None


def calculate_age(date_of_birth: Optional[str]) -> Optional[int]:
    """
    Calculate age from date of birth.
    
    Args:
        date_of_birth: Date of birth string
    
    Returns:
        Age in years, or None if date cannot be parsed
    """
    dob = _parse_date(date_of_birth)
    if not dob:
        return None
    
    today = datetime.now()
    age = today.year - dob.year
    
    # Adjust if birthday hasn't occurred this year
    if (today.month, today.day) < (dob.month, dob.day):
        age -= 1
    
    return age


def is_document_valid(expiry_date: Optional[str]) -> Optional[bool]:
    """
    Check if identity document is still valid (not expired).
    
    Args:
        expiry_date: Expiry date string
    
    Returns:
        True if document is valid, False if expired, None if date cannot be parsed
    """
    expiry = _parse_date(expiry_date)
    if not expiry:
        return None
    
    return expiry > datetime.now()


def calculate_document_validity_days(expiry_date: Optional[str]) -> Optional[int]:
    """
    Calculate number of days until document expiry.
    
    Args:
        expiry_date: Expiry date string
    
    Returns:
        Number of days until expiry (negative if expired), None if date cannot be parsed
    """
    expiry = _parse_date(expiry_date)
    if not expiry:
        return None
    
    today = datetime.now()
    delta = expiry - today
    return delta.days


def normalize_name(name: Optional[str]) -> Optional[str]:
    """
    Normalize name for comparison (uppercase, remove extra spaces).
    
    Args:
        name: Name string to normalize
    
    Returns:
        Normalized name string, or None if input is empty
    """
    if not name:
        return None
    
    # Remove extra spaces, convert to uppercase
    normalized = re.sub(r'\s+', ' ', name.strip().upper())
    return normalized if normalized else None


def calculate_name_match_score(name1: Optional[str], name2: Optional[str]) -> Optional[float]:
    """
    Calculate a simple name matching score between two names.
    
    Args:
        name1: First name string
        name2: Second name string
    
    Returns:
        Score between 0.0 and 1.0 (1.0 = exact match), None if either name is missing
    """
    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)
    
    if not norm1 or not norm2:
        return None
    
    if norm1 == norm2:
        return 1.0
    
    # Simple word-based matching
    words1 = set(norm1.split())
    words2 = set(norm2.split())
    
    if not words1 or not words2:
        return 0.0
    
    # Calculate Jaccard similarity
    intersection = len(words1 & words2)
    union = len(words1 | words2)
    
    return intersection / union if union > 0 else 0.0


def calculate_identity_verification_kpis(identity_doc: Dict[str, str]) -> Dict[str, Any]:
    """
    Calculate all identity verification KPIs from an identity document.
    
    Args:
        identity_doc: Dictionary containing identity document fields:
            - full_name: Full name of the passport holder
            - date_of_birth: Date of birth
            - address: Residential address
            - passport_number: Passport number
            - expiry_date: Passport expiry date
            - issuing_country: Country that issued the passport
    
    Returns:
        Dictionary containing calculated KPIs:
            - age: Age in years
            - document_valid: Boolean indicating if document is valid (not expired)
            - days_until_expiry: Number of days until expiry (negative if expired)
            - document_verification_status: String status ("valid", "expired", "unknown")
            - issuing_country: Country that issued the document
            - has_passport_number: Boolean indicating if passport number is present
            - has_address: Boolean indicating if address is present
    """
    date_of_birth = identity_doc.get("date_of_birth")
    expiry_date = identity_doc.get("expiry_date")
    issuing_country = identity_doc.get("issuing_country")
    passport_number = identity_doc.get("passport_number")
    address = identity_doc.get("address")
    
    # Calculate age
    age = calculate_age(date_of_birth)
    
    # Check document validity
    document_valid = is_document_valid(expiry_date)
    days_until_expiry = calculate_document_validity_days(expiry_date)
    
    # Determine verification status
    if document_valid is None:
        document_verification_status = "unknown"
    elif document_valid:
        document_verification_status = "valid"
    else:
        document_verification_status = "expired"
    
    return {
        "age": age,
        "document_valid": document_valid,
        "days_until_expiry": days_until_expiry,
        "document_verification_status": document_verification_status,
        "issuing_country": issuing_country if issuing_country else None,
        "has_passport_number": bool(passport_number and passport_number.strip()),
        "has_address": bool(address and address.strip()),
    }

