using Microsoft.Extensions.DependencyInjection;
using Backend.Services;
using Backend.Hubs;    
using System;

namespace Backend.Extensions
{
    public static class AppServicesExtensions
    {
        public static IServiceCollection AddAppServices(this IServiceCollection services)
        {
            // SignalR
            services.AddSignalR();

            // Game services
            services.AddSingleton<GameManager>();
            services.AddScoped<QuestionsService>();

            // CORS
            services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");

                    policy.WithOrigins(
                              frontendUrl ?? "http://localhost:3000")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            return services;
        }
    }
}
