using Microsoft.AspNetCore.Builder;

namespace Backend.Extensions
{
    public static class PipelineExtensions
    {
        public static WebApplication UseAppPipeline(this WebApplication app)
        {
            app.UseExceptionHandler(errorApp =>
            {
                errorApp.Run(async context =>
                {
                    context.Response.StatusCode = 500;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new { msg = "Server error" });
                });
            });

            app.UseAuthentication();
            app.UseAuthorization();
            app.UseHttpsRedirection();
            app.MapControllers();

            return app;
        }
    }
}
