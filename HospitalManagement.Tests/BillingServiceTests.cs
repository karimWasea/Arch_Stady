using HospitalManagement.Application.DTOs.Billing;
using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Notifications;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Application.Services.Billing;
using HospitalManagement.Domain.Entities.Billing;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;
using Moq;

namespace HospitalManagement.Tests;

public class BillingServiceTests
{
    private readonly Mock<IInvoiceRepository> _invoiceRepoMock = new();
    private readonly Mock<IPaymentRepository> _paymentRepoMock = new();
    private readonly Mock<IInsuranceRepository> _insuranceRepoMock = new();
    private readonly Mock<IPatientRepository> _patientRepoMock = new();
    private readonly Mock<ICacheService> _cacheServiceMock = new();
    private readonly Mock<IEmailService> _emailServiceMock = new();

    private readonly BillingService _service;

    public BillingServiceTests()
    {
        _service = new BillingService(
            _invoiceRepoMock.Object,
            _paymentRepoMock.Object,
            _insuranceRepoMock.Object,
            _patientRepoMock.Object,
            _cacheServiceMock.Object,
            _emailServiceMock.Object);
    }

    [Fact]
    public async Task CreateInvoiceAsync_WhenPatientHasInsurance_CalculatesCoverageAndBalanceDue()
    {
        // Arrange: Service subtotal = 1000, Tax = 0, Discount = 0. Total = 1000.
        // Insurance covers 80% up to 5000 -> Coverage = 800. Net TotalAmount = 200. Balance due = 200.
        var dto = new CreateInvoiceDto
        {
            PatientId = 1,
            TaxPercentage = 0m,
            DiscountAmount = 0m,
            ApplyInsurance = true,
            Items = new List<CreateInvoiceItemDto>
            {
                new() { Description = "Cardiology Consultation", Quantity = 1, UnitPrice = 400m },
                new() { Description = "Echocardiogram Procedure", Quantity = 1, UnitPrice = 600m }
            }
        };

        var patient = Patient.Create("Clark", "Kent", new DateTime(1980, 1, 1), "Male", "123", "clark@dailyplanet.com", "Metropolis").SetId(1);
        var insurance = Insurance.Create(1, "Daily Planet Health", "POL-123", 80m, 5000m, DateTime.UtcNow.AddYears(1)).SetId(10);

        _patientRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(patient);
        _insuranceRepoMock.Setup(r => r.GetActiveByPatientIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(insurance);

        _invoiceRepoMock.Setup(r => r.AddAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Invoice inv, CancellationToken _) =>
            {
                inv.SetId(101);
                inv.Patient = patient;
                return inv;
            });

        // Act
        var result = await _service.CreateInvoiceAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(1000m, result.SubTotal);
        Assert.Equal(800m, result.InsuranceCoverageAmount);
        Assert.Equal(200m, result.BalanceDue);
        Assert.Equal(InvoiceStatus.Pending, result.Status);

        _invoiceRepoMock.Verify(r => r.AddAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()), Times.Once);
        _emailServiceMock.Verify(e => e.SendInvoiceCreatedAsync(It.Is<InvoiceNotificationDto>(n =>
            n.PatientEmail == "clark@dailyplanet.com" &&
            n.TotalAmount == 200m &&
            n.BalanceDue == 200m
        ), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RecordPaymentAsync_ReducesBalanceDueAndMarksInvoicePaidWhenZero()
    {
        // Arrange
        var invoice = Invoice.Create(
            invoiceNumber: "INV-2026-0001",
            patientId: 1,
            appointmentId: null,
            items: new[] { InvoiceItem.Create("Service", 1, 500m) },
            taxPercentage: 0m,
            discountAmount: 0m,
            insuranceCoverage: 0m).SetId(101);
        invoice.AddPayment(200m, PaymentMethod.Cash);

        _invoiceRepoMock.Setup(r => r.GetByIdAsync(101, It.IsAny<CancellationToken>())).ReturnsAsync(invoice);

        var paymentDto = new RecordPaymentDto
        {
            InvoiceId = 101,
            Amount = 300m,
            PaymentMethod = PaymentMethod.CreditCard,
            TransactionReference = "TXN-998811"
        };

        _paymentRepoMock.Setup(r => r.AddAsync(It.IsAny<Payment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Payment p, CancellationToken _) =>
            {
                p.SetId(555);
                return p;
            });

        // Act
        var result = await _service.RecordPaymentAsync(paymentDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(300m, result.Amount);
        Assert.Equal(500m, invoice.PaidAmount);
        Assert.Equal(0m, invoice.BalanceDue);
        Assert.Equal(InvoiceStatus.Paid, invoice.Status);

        _invoiceRepoMock.Verify(r => r.UpdateAsync(invoice, It.IsAny<CancellationToken>()), Times.Once);
    }
}
