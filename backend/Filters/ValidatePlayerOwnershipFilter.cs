using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.IdentityModel.Tokens.Jwt;
using System.Reflection;
using System.Security.Claims;

namespace Backend.Filters
{
    public class ValidatePlayerOwnershipFilter : ActionFilterAttribute
    {
        public override void OnActionExecuting(ActionExecutingContext context)
        {
            var playerId = ExtractPlayerId(context);

            if (!playerId.HasValue)
            {
                base.OnActionExecuting(context);
                return;
            }

            // If PlayerId is provided, user must be authenticated with valid JWT
            // Frontend: On 401 response, attempt token refresh before redirecting to login
            if (context.HttpContext.User?.Identity?.IsAuthenticated != true)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var currentUserIdClaim = context.HttpContext.User.FindFirst("playerId")?.Value
                ?? context.HttpContext.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(currentUserIdClaim)
            || !int.TryParse(currentUserIdClaim, out int currentUserId)
            || currentUserId != playerId.Value)
            {
                context.Result = new UnauthorizedObjectResult(new 
                    { error = "You cannot act for another player." });
                return;
            }

            base.OnActionExecuting(context);
        }

        private static int? ExtractPlayerId(ActionExecutingContext context)
        {
            foreach (var argument in context.ActionArguments.Values)
            {
                if (argument == null)
                    continue;

                if (argument is int argInt)
                    return argInt;

                var prop = argument.GetType().GetProperty(
                    "PlayerId",
                    BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase
                );

                if (prop == null)
                    continue;

                var value = prop.GetValue(argument);
                if (value is int valueInt)
                    return valueInt;

                if (value != null && int.TryParse(value.ToString(), out var parsedId))
                    return parsedId;
            }

            return null;
        }
    }
}