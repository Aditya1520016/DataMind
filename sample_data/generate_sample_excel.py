#!/usr/bin/env python3
"""
Generate sample Excel test files for DataMind Enterprise
Run: python generate_sample_excel.py
"""

import random
from datetime import datetime, timedelta

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
except ImportError:
    print("Install openpyxl first: pip install openpyxl")
    exit(1)


def generate_hr_excel():
    """Generate a realistic HR dataset as Excel file"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Employee Data"

    departments = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Product", "Design", "Operations"]
    positions = {
        "Engineering": ["Junior Engineer", "Senior Engineer", "Lead Engineer", "Engineering Manager"],
        "Marketing": ["Marketing Analyst", "Marketing Manager", "CMO", "Content Specialist"],
        "Sales": ["Sales Rep", "Account Executive", "Sales Manager", "VP Sales"],
        "HR": ["HR Coordinator", "HR Manager", "Recruiter", "CHRO"],
        "Finance": ["Financial Analyst", "Senior Analyst", "Finance Manager", "CFO"],
        "Product": ["Product Manager", "Senior PM", "Director of Product", "CPO"],
        "Design": ["UX Designer", "Senior Designer", "Design Lead", "Head of Design"],
        "Operations": ["Ops Analyst", "Operations Manager", "VP Operations", "COO"],
    }
    locations = ["New York", "San Francisco", "London", "Austin", "Chicago", "Seattle", "Boston", "Remote"]
    education = ["Bachelor's", "Master's", "PhD", "Associate's", "High School"]

    headers = [
        "employee_id", "first_name", "last_name", "department", "position",
        "salary", "hire_date", "years_at_company", "performance_score",
        "location", "education", "age", "gender", "attrition", "overtime_hours",
        "training_hours", "satisfaction_score", "projects_completed"
    ]

    # Style headers
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)

    for ci, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=ci, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    # Generate 200 employees
    first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
                   "William", "Barbara", "David", "Elizabeth", "Richard", "Susan", "Joseph", "Sarah",
                   "Alex", "Emma", "Chris", "Olivia", "Ryan", "Sophia", "Kevin", "Isabella"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
                  "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore",
                  "Martin", "Jackson", "Thompson", "White", "Lopez", "Lee", "Harris", "Clark"]

    random.seed(42)
    base_date = datetime(2015, 1, 1)

    for i in range(2, 202):
        dept = random.choice(departments)
        pos_list = positions[dept]
        pos_idx = random.choices([0, 1, 2, 3], weights=[40, 35, 18, 7])[0]
        position = pos_list[min(pos_idx, len(pos_list) - 1)]
        
        base_salary = {"Engineering": 95000, "Marketing": 75000, "Sales": 70000,
                      "HR": 65000, "Finance": 85000, "Product": 100000,
                      "Design": 80000, "Operations": 72000}.get(dept, 70000)
        salary_multiplier = [1.0, 1.3, 1.7, 2.2][pos_idx]
        salary = int(base_salary * salary_multiplier * random.uniform(0.9, 1.1))

        hire_date = base_date + timedelta(days=random.randint(0, 3285))
        years = round((datetime.now() - hire_date).days / 365.25, 1)
        age = random.randint(22, 60)
        performance = round(random.gauss(3.5, 0.7), 1)
        performance = max(1.0, min(5.0, performance))
        
        row = [
            f"EMP{1000 + i}",
            random.choice(first_names),
            random.choice(last_names),
            dept, position, salary,
            hire_date.strftime("%Y-%m-%d"),
            years,
            round(performance, 1),
            random.choice(locations),
            random.choice(education),
            age,
            random.choice(["Male", "Female", "Non-binary"]),
            "Yes" if random.random() < 0.15 else "No",
            random.randint(0, 20),
            random.randint(0, 40),
            round(random.gauss(3.8, 0.8), 1),
            random.randint(1, 15),
        ]
        
        for ci, val in enumerate(row, 1):
            ws.cell(row=i, column=ci, value=val)

    # Auto-width
    col_widths = [10, 12, 14, 14, 22, 10, 12, 16, 18, 14, 12, 5, 10, 10, 16, 16, 18, 18]
    for ci, width in enumerate(col_widths, 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(ci)].width = width

    # Second sheet: Department Summary
    ws2 = wb.create_sheet("Department Summary")
    ws2.cell(1, 1, "Department").font = Font(bold=True)
    ws2.cell(1, 2, "Headcount").font = Font(bold=True)
    ws2.cell(1, 3, "Avg Salary").font = Font(bold=True)
    ws2.cell(1, 4, "Avg Performance").font = Font(bold=True)

    dept_data = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        d = row[3]
        if d not in dept_data:
            dept_data[d] = {"count": 0, "salary_sum": 0, "perf_sum": 0}
        dept_data[d]["count"] += 1
        dept_data[d]["salary_sum"] += row[5] or 0
        dept_data[d]["perf_sum"] += row[8] or 0

    for ri, (dept, data) in enumerate(dept_data.items(), 2):
        ws2.cell(ri, 1, dept)
        ws2.cell(ri, 2, data["count"])
        ws2.cell(ri, 3, round(data["salary_sum"] / data["count"]))
        ws2.cell(ri, 4, round(data["perf_sum"] / data["count"], 2))

    filename = "sample_data/hr_dataset.xlsx"
    wb.save(filename)
    print(f"✓ Generated: {filename} (200 employees, 2 sheets)")
    return filename


def generate_finance_excel():
    """Generate a financial transactions dataset"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Transactions"

    headers = ["transaction_id", "date", "category", "subcategory", "amount",
               "currency", "department", "vendor", "approved_by", "budget_code",
               "is_recurring", "payment_method", "fiscal_quarter"]

    header_fill = PatternFill(start_color="0A3054", end_color="0A3054", fill_type="solid")
    for ci, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=ci, value=h)
        cell.fill = header_fill
        cell.font = Font(color="FFFFFF", bold=True)

    categories = {
        "Operations": ["Software Licenses", "Cloud Infrastructure", "Office Supplies", "Equipment"],
        "Marketing": ["Digital Ads", "Events", "Content Creation", "PR Agency"],
        "R&D": ["Research Tools", "Lab Equipment", "Consulting", "Patents"],
        "HR": ["Recruitment", "Training", "Benefits", "Team Events"],
        "Sales": ["Travel", "Client Entertainment", "CRM Tools", "Commission"],
    }
    vendors = ["AWS", "Google Cloud", "Microsoft", "Salesforce", "Slack", "Zoom",
               "Adobe", "Atlassian", "HubSpot", "DocuSign", "Stripe", "Twilio"]
    approvers = ["Sarah Chen", "Mike Johnson", "Lisa Wang", "Tom Brown", "Anna Davis"]
    methods = ["Credit Card", "Wire Transfer", "ACH", "Check", "Crypto"]

    random.seed(123)
    base_date = datetime(2024, 1, 1)

    for i in range(2, 302):  # 300 transactions
        dept = random.choice(list(categories.keys()))
        cat = random.choice(categories[dept])
        amount = round(random.lognormal(7, 1.5), 2)  # realistic skewed distribution
        date = base_date + timedelta(days=random.randint(0, 364))
        quarter = f"Q{(date.month - 1) // 3 + 1}"

        row = [
            f"TXN{10000 + i}",
            date.strftime("%Y-%m-%d"),
            dept, cat,
            amount,
            "USD",
            dept,
            random.choice(vendors),
            random.choice(approvers),
            f"BC-{random.randint(100, 999)}",
            random.choice(["Yes", "No"]),
            random.choice(methods),
            quarter,
        ]
        for ci, val in enumerate(row, 1):
            ws.cell(row=i, column=ci, value=val)

    filename = "sample_data/finance_transactions.xlsx"
    wb.save(filename)
    print(f"✓ Generated: {filename} (300 transactions)")
    return filename


if __name__ == "__main__":
    import os
    os.makedirs("sample_data", exist_ok=True)
    
    print("Generating sample Excel files for DataMind Enterprise testing...")
    print()
    generate_hr_excel()
    generate_finance_excel()
    print()
    print("Done! Upload these files to DataMind to test Excel support.")
