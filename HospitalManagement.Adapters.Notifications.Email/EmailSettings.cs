namespace HospitalManagement.Adapters.Notifications.Email;

public class EmailSettings
{
    public const string SectionName = "Email";

    public string SmtpHost { get; set; } = "localhost";
    public int SmtpPort { get; set; } = 25;
    public string SenderEmail { get; set; } = "notifications@hospital.local";
    public string SenderName { get; set; } = "Hospital Care Center";
    public string? Username { get; set; }
    public string? Password { get; set; }
    public bool EnableSsl { get; set; } = false;

    /// <summary>
    /// When true, emails are simulated and rendered to the console/logger.
    /// Perfect for local development and demonstration.
    /// </summary>
    public bool UseDevelopmentLogger { get; set; } = true;
}
