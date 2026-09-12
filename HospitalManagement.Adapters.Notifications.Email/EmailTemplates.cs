using HospitalManagement.Core.Ports.Outbound.Notifications;

namespace HospitalManagement.Adapters.Notifications.Email;

public static class EmailTemplates
{
    public static string BuildAppointmentBookedHtml(AppointmentNotificationDto n) => $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'/>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px; }}
        .card {{ background: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }}
        .header {{ background: linear-gradient(135deg, #1976d2, #0d47a1); color: #ffffff; padding: 24px; text-align: center; }}
        .content {{ padding: 24px 30px; color: #333333; }}
        .badge {{ display: inline-block; padding: 6px 12px; border-radius: 20px; background: #e3f2fd; color: #1565c0; font-weight: 600; font-size: 12px; text-transform: uppercase; }}
        .info-table {{ width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }}
        .info-table td {{ padding: 10px 0; border-bottom: 1px solid #eeeeee; font-size: 14px; }}
        .info-table td.label {{ color: #757575; width: 35%; }}
        .info-table td.val {{ font-weight: 600; color: #212121; }}
        .footer {{ background: #fafafa; padding: 15px; text-align: center; font-size: 12px; color: #9e9e9e; border-top: 1px solid #eeeeee; }}
    </style>
</head>
<body>
    <div class='card'>
        <div class='header'>
            <h2 style='margin:0;'>🏥 Appointment Confirmed</h2>
            <p style='margin:5px 0 0; opacity:0.9;'>Hospital Management System</p>
        </div>
        <div class='content'>
            <p>Dear <strong>{n.PatientName}</strong>,</p>
            <p>Your medical appointment has been successfully scheduled. Here are the details:</p>
            
            <table class='info-table'>
                <tr>
                    <td class='label'>Appointment ID:</td>
                    <td class='val'>#{n.AppointmentId}</td>
                </tr>
                <tr>
                    <td class='label'>Doctor:</td>
                    <td class='val'>{n.DoctorName} ({n.DoctorSpecialization})</td>
                </tr>
                <tr>
                    <td class='label'>Date & Time:</td>
                    <td class='val'>{n.AppointmentDate:dddd, MMMM dd, yyyy 'at' hh:mm tt}</td>
                </tr>
                <tr>
                    <td class='label'>Status:</td>
                    <td class='val'><span class='badge'>{n.Status}</span></td>
                </tr>
                {(!string.IsNullOrWhiteSpace(n.Notes) ? $"<tr><td class='label'>Notes:</td><td class='val'>{n.Notes}</td></tr>" : "")}
            </table>
            
            <p style='font-size: 13px; color: #616161;'>
                Please arrive 15 minutes prior to your scheduled consultation. If you need to reschedule or cancel, please visit our online portal.
            </p>
        </div>
        <div class='footer'>
            &copy; 2026 Hospital Management System &bull; Hexagonal Architecture Demonstration
        </div>
    </div>
</body>
</html>";

    public static string BuildAppointmentCancelledHtml(AppointmentNotificationDto n) => $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'/>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px; }}
        .card {{ background: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }}
        .header {{ background: linear-gradient(135deg, #d32f2f, #c62828); color: #ffffff; padding: 24px; text-align: center; }}
        .content {{ padding: 24px 30px; color: #333333; }}
        .info-table {{ width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }}
        .info-table td {{ padding: 10px 0; border-bottom: 1px solid #eeeeee; font-size: 14px; }}
        .footer {{ background: #fafafa; padding: 15px; text-align: center; font-size: 12px; color: #9e9e9e; border-top: 1px solid #eeeeee; }}
    </style>
</head>
<body>
    <div class='card'>
        <div class='header'>
            <h2 style='margin:0;'>⚠️ Appointment Cancelled</h2>
            <p style='margin:5px 0 0; opacity:0.9;'>Hospital Management System</p>
        </div>
        <div class='content'>
            <p>Dear <strong>{n.PatientName}</strong>,</p>
            <p>Your appointment #{n.AppointmentId} with <strong>{n.DoctorName}</strong> on <strong>{n.AppointmentDate:MMMM dd, yyyy 'at' hh:mm tt}</strong> has been cancelled.</p>
            <p>If you believe this was in error, or if you would like to book a new appointment, please log into your patient portal.</p>
        </div>
        <div class='footer'>
            &copy; 2026 Hospital Management System
        </div>
    </div>
</body>
</html>";

    public static string BuildAppointmentRescheduledHtml(AppointmentNotificationDto n, DateTime oldDate) => $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'/>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px; }}
        .card {{ background: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }}
        .header {{ background: linear-gradient(135deg, #ed6c02, #e65100); color: #ffffff; padding: 24px; text-align: center; }}
        .content {{ padding: 24px 30px; color: #333333; }}
        .footer {{ background: #fafafa; padding: 15px; text-align: center; font-size: 12px; color: #9e9e9e; border-top: 1px solid #eeeeee; }}
    </style>
</head>
<body>
    <div class='card'>
        <div class='header'>
            <h2 style='margin:0;'>🗓️ Appointment Rescheduled</h2>
            <p style='margin:5px 0 0; opacity:0.9;'>Hospital Management System</p>
        </div>
        <div class='content'>
            <p>Dear <strong>{n.PatientName}</strong>,</p>
            <p>Your appointment #{n.AppointmentId} with <strong>{n.DoctorName}</strong> has been rescheduled:</p>
            <ul>
                <li><strong>Previous Time:</strong> <strike>{oldDate:MMMM dd, yyyy 'at' hh:mm tt}</strike></li>
                <li><strong>New Time:</strong> <span style='color:#ed6c02; font-weight:bold;'>{n.AppointmentDate:MMMM dd, yyyy 'at' hh:mm tt}</span></li>
            </ul>
        </div>
        <div class='footer'>
            &copy; 2026 Hospital Management System
        </div>
    </div>
</body>
</html>";
}
