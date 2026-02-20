using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Backend.Data;
using System;

namespace Backend.Extensions
{
    public static class DatabaseExtensions
    {
        public static IServiceCollection AddAppDatabase(this IServiceCollection services)
        {
            var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION")
                ?? throw new InvalidOperationException("DB_CONNECTION env var is missing");

            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(connectionString)
            );

            return services;
        }
    }
}
