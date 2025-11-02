from datetime import datetime
from collections import defaultdict
from typing import Optional, Dict

class KPIService:
    
    def parse_amount(amount: str) -> float:
        return float(amount.replace(",", "").replace("$", "").strip())

    def get_month_key(date_str: str) -> str:
        return datetime.strptime(date_str, "%d %b %Y").strftime("%Y-%m")

    def calculate_bank_kpis(statement: dict,
                            daily_balances: Optional[Dict[str, float]] = None,
                            opening_balance: Optional[float] = None):
        transactions = statement.get("transactions_table", [])
        if not transactions:
            return {
                "average_monthly_transaction_count": None,
                "monthly_average_debit": None,
                "monthly_average_credit": None,
                "average_monthly_debit_credit_ratio": None,
                "average_monthly_balance": None
            }

        # Aggregate data per month
        monthly_data = defaultdict(lambda: {"count": 0, "debits": 0.0, "credits": 0.0})

        for txn in transactions:
            month = get_month_key(txn["date"])
            amount = parse_amount(txn["amount"])
            monthly_data[month]["count"] += 1

            if txn["type"].lower() == "debit":
                monthly_data[month]["debits"] += amount
            else:
                monthly_data[month]["credits"] += amount

        months = list(monthly_data.keys())
        n_months = len(months)

        # Safe division helper
        def safe_div(a, b):
            return a / b if (b and b != 0) else None

        avg_txn_count = safe_div(sum(m["count"] for m in monthly_data.values()), n_months)
        avg_debit = safe_div(sum(m["debits"] for m in monthly_data.values()), n_months)
        avg_credit = safe_div(sum(m["credits"] for m in monthly_data.values()), n_months)

        # Debit/Credit Ratio
        debit_credit_ratio = safe_div(avg_debit, avg_credit)

        # -------- Average Monthly Balance Calculation --------
        avg_monthly_balance = None

        # 1) If daily balances are provided
        if daily_balances:
            monthly_balances = defaultdict(list)
            for date_str, bal in daily_balances.items():
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                key = dt.strftime("%Y-%m")
                monthly_balances[key].append(bal)

            if monthly_balances:
                avg_monthly_balance = sum(
                    sum(bals) / len(bals) for bals in monthly_balances.values()
                ) / len(monthly_balances)

        # 2) If opening balance provided, estimate
        elif opening_balance is not None:
            daily_net = defaultdict(float)
            for txn in transactions:
                dt_key = datetime.strptime(txn["date"], "%d %b %Y").strftime("%Y-%m-%d")
                amount = parse_amount(txn["amount"])
                daily_net[dt_key] += (-amount if txn["type"].lower() == "debit" else amount)

            if daily_net:
                bal = opening_balance
                monthly_balances = defaultdict(list)
                for d in sorted(daily_net.keys()):
                    bal += daily_net[d]
                    dt = datetime.strptime(d, "%Y-%m-%d")
                    key = dt.strftime("%Y-%m")
                    monthly_balances[key].append(bal)

                avg_monthly_balance = sum(
                    sum(bals) / len(bals) for bals in monthly_balances.values()
                ) / len(monthly_balances)

        # Results
        return {
            "average_monthly_transaction_count": round(avg_txn_count, 2) if avg_txn_count is not None else None,
            "monthly_average_debit": round(avg_debit, 2) if avg_debit is not None else None,
            "monthly_average_credit": round(avg_credit, 2) if avg_credit is not None else None,
            "average_monthly_debit_credit_ratio": round(debit_credit_ratio, 4) if debit_credit_ratio is not None else None,
            "average_monthly_balance": round(avg_monthly_balance, 2) if avg_monthly_balance is not None else None
        }
