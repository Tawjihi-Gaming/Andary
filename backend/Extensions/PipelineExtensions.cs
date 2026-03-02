using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;

namespace Backend.Extensions
{
    public static class PipelineExtensions
    {
        public static WebApplication UseAppPipeline(this WebApplication app)
        {
            app.UseForwardedHeaders(new ForwardedHeadersOptions
            {
                ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
            });

            app.UseExceptionHandler(errorApp =>
            {
                errorApp.Run(async context =>
                {
                    var exceptionFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
                    var exception = exceptionFeature?.Error;
                    
                    context.Response.StatusCode = 500;
                    context.Response.ContentType = "application/json";
                    
                    var isDev = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
                    
                    if (isDev && exception != null)
                    {
                        await context.Response.WriteAsJsonAsync(new 
                        { 
                            msg = "Server error",
                            error = exception.Message,
                            stackTrace = exception.StackTrace
                        });
                    }
                    else
                    {
                        await context.Response.WriteAsJsonAsync(new { msg = "Server error" });
                    }
                });
            });

            app.UseRateLimiter();

            app.UseCors();

            app.UseAuthentication();
            app.UseAuthorization();

            // Keep local development simple with Vite proxy (http://localhost:5000).
            // Enforce HTTPS outside Development.
            if (!app.Environment.IsDevelopment())
                app.UseHttpsRedirection();

            app.MapControllers();

            return app;
        }
    }
}
