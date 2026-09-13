using System.Reflection;

namespace HospitalManagement.Tests;

public static class TestEntityExtensions
{
    public static T SetId<T>(this T entity, int id) where T : class
    {
        var prop = typeof(T).GetProperty("Id", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
        prop?.SetValue(entity, id);
        return entity;
    }

    public static T SetProperty<T>(this T entity, string propertyName, object? value) where T : class
    {
        var prop = typeof(T).GetProperty(propertyName, BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
        if (prop != null)
        {
            prop.SetValue(entity, value);
        }
        return entity;
    }
}
