using HospitalManagement.Domain.Entities.Billing;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Entities.Laboratory;
using HospitalManagement.Domain.Entities.Pharmacy;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;

namespace HospitalManagement.Tests;

public class DomainEntitiesTests
{
    // =========================================================================
    // 1. BILLING BOUNDED CONTEXT: INVOICE & INSURANCE INVARIANTS
    // =========================================================================

    [Fact]
    public void Invoice_Create_CalculatesSubtotalTaxDiscountAndInsuranceCoverageCorrectly()
    {
        // Items: 2 items, total 500 + 300 = 800
        var items = new List<InvoiceItem>
        {
            InvoiceItem.Create("Consultation Fee", 1, 500m),
            InvoiceItem.Create("Diagnostics Lab Fee", 1, 300m)
        };

        // Tax: 10% on 800 = 80. Gross = 880. Discount = 80. Net = 800.
        // Insurance coverage = 600. Patient BalanceDue = 200.
        var invoice = Invoice.Create(
            invoiceNumber: "INV-2026-TEST1",
            patientId: 1,
            appointmentId: 10,
            items: items,
            taxPercentage: 10m,
            discountAmount: 80m,
            insuranceCoverage: 600m);

        Assert.Equal(800m, invoice.SubTotal);
        Assert.Equal(80m, invoice.TaxAmount);
        Assert.Equal(80m, invoice.DiscountAmount);
        Assert.Equal(600m, invoice.InsuranceCoverageAmount);
        Assert.Equal(200m, invoice.TotalAmount);
        Assert.Equal(200m, invoice.BalanceDue);
        Assert.Equal(0m, invoice.PaidAmount);
        Assert.Equal(InvoiceStatus.Pending, invoice.Status);
    }

    [Fact]
    public void Invoice_Create_WithoutItems_ThrowsBusinessRuleException()
    {
        Assert.Throws<BusinessRuleException>(() =>
            Invoice.Create("INV-NO-ITEMS", 1, null, new List<InvoiceItem>(), 0m, 0m, 0m));
    }

    [Fact]
    public void Invoice_Create_WhenDiscountExceedsGrossAmount_ThrowsBusinessRuleException()
    {
        var items = new List<InvoiceItem> { InvoiceItem.Create("Service", 1, 100m) };

        // SubTotal = 100, Tax = 0, Gross = 100. Discount = 150 (exceeds gross).
        var ex = Assert.Throws<BusinessRuleException>(() =>
            Invoice.Create("INV-DISC-ERR", 1, null, items, 0m, 150m, 0m));

        Assert.Contains("Discount amount cannot exceed gross invoice amount", ex.Message);
    }

    [Fact]
    public void Invoice_AddPayment_PartialAndFullPayment_UpdatesBalanceDueAndStatus()
    {
        var items = new List<InvoiceItem> { InvoiceItem.Create("Surgery", 1, 1000m) };
        var invoice = Invoice.Create("INV-PAY-1", 1, null, items, 0m, 0m, 0m);

        Assert.Equal(1000m, invoice.BalanceDue);
        Assert.Equal(InvoiceStatus.Pending, invoice.Status);

        // 1. Partial Payment of 400
        var payment1 = invoice.AddPayment(400m, PaymentMethod.CreditCard, "TXN-001");
        Assert.Equal(400m, invoice.PaidAmount);
        Assert.Equal(600m, invoice.BalanceDue);
        Assert.Equal(InvoiceStatus.PartiallyPaid, invoice.Status);
        Assert.Single(invoice.Payments);

        // 2. Final Payment of 600
        var payment2 = invoice.AddPayment(600m, PaymentMethod.Cash, "TXN-002");
        Assert.Equal(1000m, invoice.PaidAmount);
        Assert.Equal(0m, invoice.BalanceDue);
        Assert.Equal(InvoiceStatus.Paid, invoice.Status);
        Assert.Equal(2, invoice.Payments.Count);
    }

    [Fact]
    public void Invoice_AddPayment_ZeroOrNegativeAmount_ThrowsBusinessRuleException()
    {
        var items = new List<InvoiceItem> { InvoiceItem.Create("Consultation", 1, 200m) };
        var invoice = Invoice.Create("INV-PAY-ERR1", 1, null, items, 0m, 0m, 0m);

        Assert.Throws<BusinessRuleException>(() => invoice.AddPayment(0m, PaymentMethod.Cash));
        Assert.Throws<BusinessRuleException>(() => invoice.AddPayment(-50m, PaymentMethod.Cash));
    }

    [Fact]
    public void Invoice_AddPayment_Overpayment_ThrowsBusinessRuleException()
    {
        var items = new List<InvoiceItem> { InvoiceItem.Create("Consultation", 1, 200m) };
        var invoice = Invoice.Create("INV-OVERPAY", 1, null, items, 0m, 0m, 0m);

        var ex = Assert.Throws<BusinessRuleException>(() => invoice.AddPayment(250m, PaymentMethod.Cash));
        Assert.Contains("exceeds balance due", ex.Message);
    }

    [Fact]
    public void Invoice_AddPayment_WhenAlreadyPaid_ThrowsBusinessRuleException()
    {
        var items = new List<InvoiceItem> { InvoiceItem.Create("Consultation", 1, 100m) };
        var invoice = Invoice.Create("INV-ALREADY-PAID", 1, null, items, 0m, 0m, 0m);
        invoice.AddPayment(100m, PaymentMethod.Cash);

        var ex = Assert.Throws<BusinessRuleException>(() => invoice.AddPayment(10m, PaymentMethod.Cash));
        Assert.Contains("already been fully paid", ex.Message);
    }

    [Fact]
    public void Invoice_Cancel_WhenPending_CancelsSuccessfully_WhenPaid_ThrowsException()
    {
        var items = new List<InvoiceItem> { InvoiceItem.Create("Checkup", 1, 150m) };
        var invoice1 = Invoice.Create("INV-CANCEL-OK", 1, null, items, 0m, 0m, 0m);
        invoice1.Cancel();
        Assert.Equal(InvoiceStatus.Cancelled, invoice1.Status);

        var invoice2 = Invoice.Create("INV-CANCEL-FAIL", 1, null, items, 0m, 0m, 0m);
        invoice2.AddPayment(150m, PaymentMethod.Cash);
        Assert.Throws<BusinessRuleException>(() => invoice2.Cancel());
    }

    [Fact]
    public void Insurance_CalculateCoverage_RespectsPercentageAndMaxCoverageCap()
    {
        // 80% coverage with 500 max cap
        var insurance = Insurance.Create(1, "HealthShield", "POL-999", 80m, 500m, DateTime.UtcNow.AddYears(1));

        // Total 400: 80% of 400 = 320 (< 500 cap) -> 320
        Assert.Equal(320m, insurance.CalculateCoverage(400m));

        // Total 1000: 80% of 1000 = 800 (> 500 cap) -> 500
        Assert.Equal(500m, insurance.CalculateCoverage(1000m));
    }

    [Fact]
    public void Insurance_CalculateCoverage_WhenExpiredOrInactive_ReturnsZeroCoverage()
    {
        var expiredInsurance = Insurance.Create(1, "HealthShield", "POL-888", 80m, 5000m, DateTime.UtcNow.AddDays(-1));
        Assert.Equal(0m, expiredInsurance.CalculateCoverage(1000m));
        Assert.False(expiredInsurance.IsEligible());
    }

    // =========================================================================
    // 2. PHARMACY BOUNDED CONTEXT: STOCK & DISPENSING INVARIANTS
    // =========================================================================

    [Fact]
    public void Stock_DeductQuantity_ReducesQuantityAndUpdatesTimestamp()
    {
        var stock = Stock.Create(1, "BATCH-01", 100, 20, DateTime.UtcNow.AddYears(1), "Shelf A");

        stock.DeductQuantity(30);
        Assert.Equal(70, stock.QuantityInStock);
        Assert.False(stock.IsLowStock);

        stock.DeductQuantity(55);
        Assert.Equal(15, stock.QuantityInStock);
        Assert.True(stock.IsLowStock); // 15 <= 20 reorder level
    }

    [Fact]
    public void Stock_DeductQuantity_WhenInsufficientQuantity_ThrowsBusinessRuleException()
    {
        var stock = Stock.Create(1, "BATCH-01", 50, 10, DateTime.UtcNow.AddYears(1), "Shelf A");

        var ex = Assert.Throws<BusinessRuleException>(() => stock.DeductQuantity(60));
        Assert.Contains("Insufficient stock in batch 'BATCH-01'", ex.Message);
    }

    [Fact]
    public void Stock_DeductQuantity_ZeroOrNegative_ThrowsBusinessRuleException()
    {
        var stock = Stock.Create(1, "BATCH-01", 50, 10, DateTime.UtcNow.AddYears(1), "Shelf A");

        Assert.Throws<BusinessRuleException>(() => stock.DeductQuantity(0));
        Assert.Throws<BusinessRuleException>(() => stock.DeductQuantity(-10));
    }

    [Fact]
    public void Stock_IsExpired_ReturnsCorrectStatusBasedOnDate()
    {
        var expiry = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var stock = Stock.Create(1, "BATCH-01", 50, 10, expiry, "Shelf A");

        Assert.False(stock.IsExpired(new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc)));
        Assert.True(stock.IsExpired(new DateTime(2026, 6, 2, 0, 0, 0, DateTimeKind.Utc)));
    }

    // =========================================================================
    // 3. LABORATORY BOUNDED CONTEXT: LAB ORDER INVARIANTS & AUTO-STATUS
    // =========================================================================

    [Fact]
    public void LabOrder_AddResult_TransitionsStatusFromOrderedToInProgressToCompleted()
    {
        // Order with 2 tests: Test 101 and Test 102
        var order = LabOrder.Create(1, 2, LabPriority.Routine, new[] { 101, 102 });
        Assert.Equal(LabOrderStatus.Ordered, order.Status);
        Assert.Equal(2, order.Items.Count);

        // 1. Add Result for Test 101 -> Order should auto-transition to InProgress
        var result1 = order.AddResult(101, "12.5 g/dL", "13.5-17.5", "g/dL", false, "Tech Jane");
        Assert.Equal(LabOrderStatus.InProgress, order.Status);
        Assert.Single(order.Results);

        // 2. Add Result for Test 102 -> Order should auto-transition to Completed
        var result2 = order.AddResult(102, "95 mg/dL", "70-99", "mg/dL", false, "Tech Jane");
        Assert.Equal(LabOrderStatus.Completed, order.Status);
        Assert.Equal(2, order.Results.Count);
    }

    [Fact]
    public void LabOrder_AddResult_ForTestNotInOrder_ThrowsBusinessRuleException()
    {
        var order = LabOrder.Create(1, 2, LabPriority.Routine, new[] { 101 });

        var ex = Assert.Throws<BusinessRuleException>(() =>
            order.AddResult(999, "Negative", "Negative", "", false, "Tech Jane"));

        Assert.Contains("is not part of this lab requisition order", ex.Message);
    }

    [Fact]
    public void LabOrder_Create_WithEmptyTestIds_ThrowsBusinessRuleException()
    {
        Assert.Throws<BusinessRuleException>(() =>
            LabOrder.Create(1, 2, LabPriority.Routine, new List<int>()));
    }

    // =========================================================================
    // 4. CLINICAL BOUNDED CONTEXT: APPOINTMENT & PRESCRIPTION INVARIANTS
    // =========================================================================

    [Fact]
    public void Appointment_Create_InThePast_ThrowsBusinessRuleException()
    {
        var pastDate = DateTime.UtcNow.AddDays(-1);

        var ex = Assert.Throws<BusinessRuleException>(() =>
            Appointment.Create(1, 2, pastDate));

        Assert.Contains("cannot be scheduled in the past", ex.Message);
    }

    [Fact]
    public void Appointment_LifecycleTransitions_ScheduledToCompletedOrCancelled()
    {
        var appointment = Appointment.Create(1, 2, DateTime.UtcNow.AddDays(2));
        Assert.Equal(AppointmentStatus.Scheduled, appointment.Status);

        // Complete
        appointment.Complete();
        Assert.Equal(AppointmentStatus.Completed, appointment.Status);

        // Cannot complete again
        Assert.Throws<BusinessRuleException>(() => appointment.Complete());

        // Cannot cancel completed appointment
        Assert.Throws<BusinessRuleException>(() => appointment.Cancel());
    }

    [Fact]
    public void Appointment_Reschedule_UpdatesDate_RejectsPastDate()
    {
        var appointment = Appointment.Create(1, 2, DateTime.UtcNow.AddDays(2));
        var newDate = DateTime.UtcNow.AddDays(5);

        appointment.Reschedule(newDate, "Patient requested later slot");
        Assert.Equal(newDate, appointment.AppointmentDate);
        Assert.Equal("Patient requested later slot", appointment.Notes);

        // Cannot reschedule to past date
        Assert.Throws<BusinessRuleException>(() =>
            appointment.Reschedule(DateTime.UtcNow.AddDays(-1)));
    }

    [Fact]
    public void Prescription_Create_RequiresAtLeastOneItem()
    {
        Assert.Throws<BusinessRuleException>(() =>
            Prescription.Create(1, 2, null, new List<PrescriptionItem>()));

        var validItems = new List<PrescriptionItem>
        {
            PrescriptionItem.Create("Amoxicillin", "500mg", "TID", "7 days", "Take with meals")
        };

        var prescription = Prescription.Create(1, 2, null, validItems, "Follow up in 10 days");
        Assert.NotNull(prescription);
        Assert.Single(prescription.PrescriptionItems);
    }
}
