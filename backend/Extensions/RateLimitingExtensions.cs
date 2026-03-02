using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Extensions
{
    public static class RateLimitingExtensions
    {
        public static IServiceCollection AddAppRateLimiting(this IServiceCollection services, IConfiguration configuration)
        {
            var section = configuration.GetSection("RateLimiting");

            var permitLimit = section.GetValue("PermitLimit", 100);
            var windowSeconds = section.GetValue("WindowSeconds", 60);
            var segmentsPerWindow = section.GetValue("SegmentsPerWindow", 4);
            var queueLimit = section.GetValue("QueueLimit", 0);

            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                options.OnRejected = async (context, cancellationToken) =>
                {
                    context.HttpContext.Response.ContentType = "application/json";

                    if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    {
                        context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
                        await context.HttpContext.Response.WriteAsJsonAsync(
                            new { msg = "Too many requests. Try again later.", retryAfterSeconds = (int)retryAfter.TotalSeconds },
                            cancellationToken);
                    }
                    else
                    {
                        await context.HttpContext.Response.WriteAsJsonAsync(
                            new { msg = "Too many requests. Try again later." },
                            cancellationToken);
                    }
                };

                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                {
                    var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                    return RateLimitPartition.GetSlidingWindowLimiter(clientIp, _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = permitLimit,
                        Window = TimeSpan.FromSeconds(windowSeconds),
                        SegmentsPerWindow = segmentsPerWindow,
                        QueueLimit = queueLimit,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                    });
                });
            });

            return services;
        }
    }
}
