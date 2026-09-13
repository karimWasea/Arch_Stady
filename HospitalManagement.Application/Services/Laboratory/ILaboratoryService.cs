using HospitalManagement.Application.DTOs.Laboratory;

namespace HospitalManagement.Application.Services.Laboratory;

public interface ILaboratoryService
{
    Task<IEnumerable<LabTestDto>> GetAllLabTestsAsync(CancellationToken cancellationToken = default);
    Task<LabTestDto> GetLabTestByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<LabTestDto> CreateLabTestAsync(CreateLabTestDto dto, CancellationToken cancellationToken = default);
    Task<LabTestDto> UpdateLabTestAsync(int id, UpdateLabTestDto dto, CancellationToken cancellationToken = default);
    Task DeleteLabTestAsync(int id, CancellationToken cancellationToken = default);

    Task<IEnumerable<LabOrderDto>> GetAllLabOrdersAsync(CancellationToken cancellationToken = default);
    Task<LabOrderDto> GetLabOrderByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<LabOrderDto>> GetLabOrdersByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<LabOrderDto> CreateLabOrderAsync(CreateLabOrderDto dto, CancellationToken cancellationToken = default);

    Task<IEnumerable<LabResultDto>> GetLabResultsByOrderIdAsync(int orderId, CancellationToken cancellationToken = default);
    Task<LabResultDto> RecordLabResultAsync(RecordLabResultDto dto, CancellationToken cancellationToken = default);
}
