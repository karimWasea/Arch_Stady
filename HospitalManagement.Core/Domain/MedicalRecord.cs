namespace HospitalManagement.Core.Domain;

public class MedicalRecord
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public int? AppointmentId { get; set; }
    public string Diagnosis { get; set; } = string.Empty;
    public string Symptoms { get; set; } = string.Empty;
    public string Treatment { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public Appointment? Appointment { get; set; }
}
