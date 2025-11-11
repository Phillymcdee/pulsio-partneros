# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - heading "Sign In" [level=1] [ref=e4]
      - paragraph [ref=e5]: Enter your email to receive a magic link
      - generic [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]: Email Address
          - textbox "Email Address" [ref=e9]:
            - /placeholder: you@example.com
        - button "Send Magic Link" [ref=e10]
  - button "Open Next.js Dev Tools" [ref=e16] [cursor=pointer]:
    - img [ref=e17]
  - alert [ref=e20]
```