# TinyTorrent

A tiny bittorrent client written in typescript for learning.

NOTE: **This is a _leech_, it doesn't upload any data to peers!**

## Usage

```bash
$ deno run -c tsconfig.json --allow-read --allow-net --allow-write src/main.ts <file.torrent> -- --debug # enable debug log
```

## Create a local test torrent file

First, install and run [bittorrent-tracker](https://github.com/webtorrent/bittorrent-tracker).

```bash
$ yarn add bittorrent-tracker 
$ ./node_modules/.bin/bittorrent-tracker --http
```

Tracker is running with the url: `http://localhost:8000/announce`.

Second, install [Folx](https://mac.eltima.com/download-manager.html).

Select `File -> Create Torrent File` to create a torrent, add above url as the tracker url.

Now we have a test torrent file that can be downloaded by our client.

## Reference

- https://blog.jse.li/posts/torrent/
- https://wiki.theory.org/BitTorrentSpecification