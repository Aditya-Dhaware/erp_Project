#!/usr/bin/env python3
"""
Backend API Testing for College ERP Fees & Billing Module
Tests all API endpoints with proper authentication and data validation
"""

import requests
import sys
import json
import uuid
from datetime import datetime

class CollegeERPAPITester:
    def __init__(self, base_url="https://fee-management-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "error": details})

    def test_health_check(self):
        """Test health endpoint"""
        try:
            response = self.session.get(f"{self.api_url}/health", timeout=10)
            success = response.status_code == 200 and response.json().get("status") == "healthy"
            self.log_test("Health Check", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Health Check", False, str(e))
            return False

    def test_admin_login(self):
        """Test admin login with correct credentials"""
        try:
            login_data = {
                "email": "admin@college.com",
                "password": "Admin@123"
            }
            response = self.session.post(f"{self.api_url}/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.token = data["token"]
                    self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                    self.log_test("Admin Login", True)
                    return True
                else:
                    self.log_test("Admin Login", False, "Missing token or user in response")
                    return False
            else:
                self.log_test("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Login", False, str(e))
            return False

    def test_auth_me(self):
        """Test getting current user info"""
        try:
            response = self.session.get(f"{self.api_url}/auth/me", timeout=10)
            success = response.status_code == 200 and "email" in response.json()
            self.log_test("Auth Me", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Auth Me", False, str(e))
            return False

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        try:
            # Test with academic year filter
            response = self.session.get(f"{self.api_url}/dashboard/stats?academic_year=2024-25", timeout=10)
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_students", "total_revenue", "total_pending_amount", "program_stats", "monthly_collection"]
                has_all_fields = all(field in data for field in required_fields)
                self.log_test("Dashboard Stats", has_all_fields, f"Missing fields: {[f for f in required_fields if f not in data]}")
                return has_all_fields
            else:
                self.log_test("Dashboard Stats", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Dashboard Stats", False, str(e))
            return False

    def test_academic_years(self):
        """Test academic years endpoint"""
        try:
            response = self.session.get(f"{self.api_url}/dashboard/academic-years", timeout=10)
            success = response.status_code == 200 and isinstance(response.json(), list)
            self.log_test("Academic Years", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Academic Years", False, str(e))
            return False

    def test_user_bills(self):
        """Test getting user bills"""
        try:
            user_id = "a1111111-1111-1111-1111-111111111111"
            response = self.session.get(f"{self.api_url}/bills/user/{user_id}", timeout=10)
            success = response.status_code == 200 and isinstance(response.json(), list)
            self.log_test("User Bills", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("User Bills", False, str(e))
            return False

    def test_pending_bills(self):
        """Test getting pending bills"""
        try:
            user_id = "a1111111-1111-1111-1111-111111111111"
            response = self.session.get(f"{self.api_url}/bills/pending?user_id={user_id}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                has_required_fields = "bills" in data and "total_pending" in data and "count" in data
                self.log_test("Pending Bills", has_required_fields, f"Missing fields in response")
                return has_required_fields
            else:
                self.log_test("Pending Bills", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Pending Bills", False, str(e))
            return False

    def test_bills_list(self):
        """Test listing all bills with filters"""
        try:
            response = self.session.get(f"{self.api_url}/bills", timeout=10)
            success = response.status_code == 200 and isinstance(response.json(), list)
            self.log_test("Bills List", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Bills List", False, str(e))
            return False

    def test_generate_bills(self):
        """Test generating bills for a student"""
        try:
            test_user_id = str(uuid.uuid4())
            bill_data = {
                "user_id": test_user_id,
                "academic_year": "2024-25",
                "program_name": "Test Program",
                "total_course_fees": 50000.0,
                "installments": 2
            }
            response = self.session.post(f"{self.api_url}/admission/generate-bills", json=bill_data, timeout=10)
            if response.status_code == 200:
                data = response.json()
                has_bills = "bills" in data and len(data["bills"]) == 2
                self.log_test("Generate Bills", has_bills, f"Expected 2 bills, got {len(data.get('bills', []))}")
                return has_bills
            else:
                self.log_test("Generate Bills", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Generate Bills", False, str(e))
            return False

    def test_brochure_payment(self):
        """Test creating brochure payment bill"""
        try:
            test_user_id = str(uuid.uuid4())
            brochure_data = {
                "user_id": test_user_id,
                "brochure_id": "BROCH_001",
                "brochure_fee_amount": 200.0,
                "academic_year": "2024-25"
            }
            response = self.session.post(f"{self.api_url}/admission/brochure-payment", json=brochure_data, timeout=10)
            success = response.status_code == 200 and "bill_id" in response.json()
            self.log_test("Brochure Payment", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Brochure Payment", False, str(e))
            return False

    def test_payments_list(self):
        """Test listing payments"""
        try:
            response = self.session.get(f"{self.api_url}/payments", timeout=10)
            success = response.status_code == 200 and isinstance(response.json(), list)
            self.log_test("Payments List", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Payments List", False, str(e))
            return False

    def test_receipts_list(self):
        """Test listing receipts"""
        try:
            response = self.session.get(f"{self.api_url}/receipts", timeout=10)
            success = response.status_code == 200 and isinstance(response.json(), list)
            self.log_test("Receipts List", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Receipts List", False, str(e))
            return False

    def test_refunds_list(self):
        """Test listing refunds"""
        try:
            response = self.session.get(f"{self.api_url}/refunds", timeout=10)
            success = response.status_code == 200 and isinstance(response.json(), list)
            self.log_test("Refunds List", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Refunds List", False, str(e))
            return False

    def test_create_payment_order(self):
        """Test creating payment order (Razorpay integration)"""
        try:
            # First get a bill to create order for
            user_id = "a1111111-1111-1111-1111-111111111111"
            bills_response = self.session.get(f"{self.api_url}/bills/user/{user_id}", timeout=10)
            if bills_response.status_code == 200:
                bills = bills_response.json()
                unpaid_bills = [b for b in bills if b["status"] == "UNPAID"]
                if unpaid_bills:
                    bill_id = unpaid_bills[0]["bill_id"]
                    response = self.session.post(f"{self.api_url}/payments/create-order?bill_id={bill_id}&user_id={user_id}", timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        has_order = "order" in data and "payment" in data and "key_id" in data
                        self.log_test("Create Payment Order", has_order, f"Missing fields in response")
                        return has_order
                    else:
                        self.log_test("Create Payment Order", False, f"Status: {response.status_code}")
                        return False
                else:
                    self.log_test("Create Payment Order", False, "No unpaid bills found for testing")
                    return False
            else:
                self.log_test("Create Payment Order", False, f"Could not fetch bills: {bills_response.status_code}")
                return False
        except Exception as e:
            self.log_test("Create Payment Order", False, str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting College ERP API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Basic connectivity
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False

        # Authentication tests
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False

        self.test_auth_me()

        # Dashboard and stats
        self.test_dashboard_stats()
        self.test_academic_years()

        # Bills management
        self.test_bills_list()
        self.test_user_bills()
        self.test_pending_bills()
        self.test_generate_bills()
        self.test_brochure_payment()

        # Payments and receipts
        self.test_payments_list()
        self.test_receipts_list()
        self.test_refunds_list()
        self.test_create_payment_order()

        # Summary
        print("=" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed tests:")
            for test in self.failed_tests:
                print(f"  • {test['test']}: {test['error']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = CollegeERPAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())