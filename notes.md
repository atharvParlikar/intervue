# Much Needed features

## Important

- [x] Notification to accept or decline a user into a meeting
- [ ] A shared chat
- [ ] Invite users

## Easy

- [ ] Switch between your video and other users video
- [ ] Fluid windows (Editor/Output/WebRTCVideo)
- [x] Change room uuid a little shorter
- [ ] Start using useMemo for caching token

## Vague or Unclear

- [ ] Cursor (editor cursor) User Identity
- [ ] Show error on the Output console
- [ ] Better UI/UX
- [x] Better user management

### Flexible layout rules

### Host user flow

1. /createRoom
2. redirect to meeting Url
3. /set-socket to set socketID in DB
4. send connectionReady message

### Participant user flow

1. go to link
2. send /verify-host
