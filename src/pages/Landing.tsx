import { Box, Button, Card, Container, Stack, Typography } from "@mui/material";

/**
 * Landing — M3-omskrivning 2026-05-28.
 *
 * Tidigare custom mil-tech-stil med fyra färgkodade sektioner. Nu M3
 * Cards med tonal primary container för varje sektion + outlined sub-
 * actions. Helhetsprototyp-länkarna i en egen sektion under.
 */

const sections = [
  { base: "/idt", label: "IDT", color: "primary" as const },
  { base: "/odt", label: "ODT", color: "success" as const },
  { base: "/live-fire", label: "Live Fire", color: "error" as const },
  { base: "/qm360", label: "QM 360", color: "warning" as const },
];

const subLinks = [
  { suffix: "", label: "Self Service" },
  { suffix: "/lanes", label: "Lanes" },
  { suffix: "/admin", label: "Admin" },
];

const prototypLinks = [
  { href: "/duk?section=idt", label: "Duk (projector)" },
  { href: "/tablet?section=idt", label: "Tablet (instructor)" },
  { href: "/tablet/prepare?section=idt", label: "Prepare session" },
  { href: "/wizard?section=idt", label: "Wizard (facilitator)" },
];

export default function Landing() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
      }}
    >
      <Container maxWidth="lg" sx={{ width: "100%" }}>
        <Typography
          sx={{
            fontSize: 56,
            fontWeight: 300,
            textAlign: "center",
            mb: 6,
            letterSpacing: "-0.5px",
          }}
        >
          Gunnery & Skills
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
          {sections.map((section) => (
            <Card
              key={section.base}
              sx={{
                p: 3,
                bgcolor: "var(--mui-palette-m3-surfaceContainerLow)",
                border: 1,
                borderColor: "divider",
                transition: "all 200ms",
                "&:hover": {
                  borderColor: `${section.color}.main`,
                  transform: "translateY(-2px)",
                  boxShadow: 4,
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: 28,
                  fontWeight: 500,
                  textAlign: "center",
                  mb: 2.5,
                  color: `${section.color}.main`,
                  letterSpacing: "0.5px",
                }}
              >
                {section.label}
              </Typography>
              <Stack spacing={1}>
                {subLinks.map((sub) => (
                  <Button
                    key={sub.suffix}
                    component="a"
                    href={`${section.base}${sub.suffix}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    fullWidth
                    sx={{ minHeight: 44 }}
                  >
                    {sub.label}
                  </Button>
                ))}
              </Stack>
            </Card>
          ))}
        </Box>

        {/* Helhetsprototyp-block */}
        <Box sx={{ mt: 6 }}>
          <Typography
            sx={{
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "text.secondary",
              textTransform: "uppercase",
              textAlign: "center",
              mb: 2,
            }}
          >
            Helhetsprototyp · Pass 0 skelett
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }, gap: 1.5 }}>
            {prototypLinks.map((link) => (
              <Button
                key={link.href}
                component="a"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                color="primary"
                sx={{
                  py: 1.5,
                  bgcolor: "var(--mui-palette-m3-surfaceContainerLow)",
                  border: 1,
                  borderColor: "divider",
                  color: "text.primary",
                  "&:hover": { borderColor: "primary.main", bgcolor: "var(--mui-palette-m3-primaryContainer)" },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
