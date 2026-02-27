using Microsoft.AspNetCore.Mvc;
using Backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HistoryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HistoryController(AppDbContext context)
        {
            _context = context;
        }

        // GET api/history/{playerId}?pageNumber=1&pageSize=10
        [HttpGet("{playerId:int}")]
        [Authorize]
        public IActionResult GetPlayerGameHistory(
            int playerId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
            if (playerId <= 0 || pageNumber <= 0 || pageSize <= 0)
                return BadRequest(new { error = "Invalid player ID, page number, or page size." });

            int startRow = (pageNumber - 1) * pageSize;

            var gameHistories = _context.GameParticipants
                .Where(gp => gp.PlayerId == playerId)
                .Include(gp => gp.GameSession)
                .OrderByDescending(gp => gp.GameSession.CreatedAt)
                .Skip(startRow)
                .Take(pageSize)
                .Select(gp => new
                {
                    gp.GameSessionId,
                    gp.FinalScore,
                    gp.FinalRank,
                    EndDate = gp.GameSession.FinishedAt,
                    gp.GameSession.TotalRounds
                })
                .ToList();

            if (!gameHistories.Any())
                return NoContent();

            return Ok(gameHistories);
        }
    }
}