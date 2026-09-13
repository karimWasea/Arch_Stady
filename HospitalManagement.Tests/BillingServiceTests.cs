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

        var patient = new Patient { Id = 1, FirstName = "Clark", LastName = "Kent", Email = "clark@dailyplanet.com" };
        var insurance = new Insurance
        {
            Id = 10,
            PatientId = 1,
            CoveragePercentage = 80m,
            MaxCoverageAmount = 5000m,
            IsActive = true,
            ExpiryDate = DateTime.UtcNow.AddYears(1)
        };

        _patientRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(patient);
        _insuranceRepoMock.Setup(r => r.GetActiveByPatientIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(insurance);

        _invoiceRepoMock.Setup(r => r.AddAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Invoice inv, CancellationToken _) =>
            {
                inv.Id = 101;
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
        var invoice = new Invoice
        {
            Id = 101,
            PatientId = 1,
            InvoiceNumber = "INV-2026-0001",
            SubTotal = 500m,
            TotalAmount = 500m,
            PaidAmount = 200m,
            BalanceDue = 300m,
            Status = InvoiceStatus.Pending
        };

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
                p.Id = 555;
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
