// =============================================================================
// VAAPP Plugin Template - RophimFake
// =============================================================================

// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "rophimnew_v2",          // Đổi hẳn ID để App xóa cache cũ
        "name": "RophimFake",
        "description": "Nguồn xem phim PhimVN2Y",
        "version": "1.0.3",             
        "baseUrl": "https://phimvn2y.com/",
        "iconUrl": "https://url-icon-vuong.png",
        "isEnabled": true,
        "isAdult": false,
        "type": "MOVIE",                
        "layoutType": "VERTICAL",       
        "playerType": "auto"       
    });
}

function getHomeSections() {
    return JSON.stringify([
        // SỬA LỖI: Điền giá trị vào trường 'path' để App có đường dẫn Fetch dữ liệu
        { slug: 'phim-le', title: 'Phim Lẻ Mới', type: 'Horizontal', path: 'phim-le' },
        { slug: 'phim-bo', title: 'Phim Bộ Mới', type: 'Horizontal', path: 'phim-bo' },
        { slug: 'phim-chieu-rap', title: 'Phim Chiếu Rạp', type: 'Horizontal', path: 'phim-chieu-rap' },
        { slug: 'phim-long-tieng', title: 'Phim Lồng Tiếng', type: 'Horizontal', path: 'phim-long-tieng' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'Hành Động', slug: 'hanh-dong' },
        { name: 'Kinh Dị', slug: 'kinh-di' },
        { name: 'Viễn Tưởng', slug: 'vien-tuong' },
        { name: 'Khoa Học', slug: 'khoa-hoc' },
        { name: 'Hoạt Hình', slug: 'hoat-hinh' }, // Đã xóa dấu cách thừa
        { name: '18+', slug: 'phim-18' }
    ]);
}

function getFilterConfig() {
    return JSON.stringify({ sort: [], category: [] });
}

// =============================================================================
// NHÓM 2: SINH URL (Hàm "Vẽ Đường Cho App Đi")
// =============================================================================

function getUrlList(slug, filtersJson) {
    var filters = JSON.parse(filtersJson || "{}");
    var page = filters.page || 1;
    return "https://phimvn2y.com/" + slug + "?page=" + page;
}

function getUrlSearch(keyword, filtersJson) {
    var page = JSON.parse(filtersJson || "{}").page || 1;
    return "https://phimvn2y.com/tim-kiem/?q=" + encodeURIComponent(keyword);
}

function getUrlDetail(slug) {
    // SỬA LỖI ĐỊNH TUYẾN: Nếu slug truyền vào đã có sẵn domain hoặc dấu gạch chéo
    if (slug.indexOf('http') === 0) return slug;
    if (slug.indexOf('/') === 0) return "https://phimvn2y.com" + slug;
    return "https://phimvn2y.com/" + slug;
}

function getUrlCategories() { return ""; }
function getUrlCountries() { return ""; }
function getUrlYears() { return ""; }

// =============================================================================
// NHÓM 3: PARSER (Hàm "Mổ Xẻ Thịt")
// =============================================================================

function parseListResponse(html) {
    try {
        var items = [];
        var regex = /class="sw-item"[^>]*data-title="([^"]+)"[\s\S]*?<a\s+href="([^"]+)"[^>]*class="v-thumbnail"[\s\S]*?<img\s+src="([^"]+)"/g;
        var match;
        
        while ((match = regex.exec(html)) !== null) {
            var cleanThumb = match[3].replace(/&amp;/g, '&'); 
            
            items.push({
                id: match[2],          
                title: match[1].trim(), 
                posterUrl: cleanThumb   
            });
        }
        
        return JSON.stringify({
            items: items,
            pagination: { currentPage: 1, totalPages: 1 }
        });
    } catch (e) {
        return JSON.stringify({ items: [], pagination: { currentPage: 1, totalPages: 1 } });
    }
}

function parseSearchResponse(html) {
    return parseListResponse(html);
}

function parseMovieDetail(html) {
    try {
        var titleMatch = html.match(/<h2[^>]*class="[^"]*heading-md media-name[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
        var title = "Chưa rõ tên phim";
        if (titleMatch) {
            title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        }

        var posterMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
        var posterUrl = posterMatch ? posterMatch[1] : "";

        var descMatch = html.match(/class="[^"]*child-box[^"]*"[\s\S]*?class="[^"]*child-content[^"]*"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
        var description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : "Đang cập nhật...";

        var qualityMatch = html.match(/<li>[^<]*<strong>Chất lượng:<\/strong>\s*([^<]+)/i);
        var quality = qualityMatch ? qualityMatch[1].trim() : "HD";

        var statusMatch = html.match(/<li>[^<]*<strong>Ngôn ngữ:<\/strong>\s*([^<]+)/i);
        var status = statusMatch ? statusMatch[1].trim() : "Vietsub";

        var episodes = [];
        var checkedUrls = {}; 

        var epRegex = /class="[^"]*item-ep[^"]*"[^>]*data-m3u8="([^"]+)"[^>]*data-embed="([^"]+)"[\s\S]*?<div class="v-title">([\s\S]*?)<\/div>/g;
        var match;

        while ((match = epRegex.exec(html)) !== null) {
            var videoStreamUrl = match[1] ? match[1].trim() : match[2].trim();
            var epName = match[3].replace(/<[^>]*>/g, '').trim(); 

            if (videoStreamUrl && !checkedUrls[videoStreamUrl]) {
                checkedUrls[videoStreamUrl] = true;
                episodes.push({
                    id: videoStreamUrl, 
                    name: epName,
                    slug: epName.toLowerCase().replace(/[^a-z0-9]/g, '-')
                });
            }
        }

        if (episodes.length === 0) {
            var canonicalMatch = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i);
            var currentUrl = canonicalMatch ? canonicalMatch[1] : "full";
            episodes.push({ id: currentUrl, name: "Full", slug: "full" });
        }

        var movieId = title.toLowerCase().replace(/[^a-z0-9]/g, '-');

        return JSON.stringify({
            id: movieId,
            title: title,
            posterUrl: posterUrl,
            backdropUrl: posterUrl,
            description: description,
            servers: [
                {
                    name: "Nguồn Phim VN",
                    episodes: episodes
                }
            ],
            quality: quality,
            year: 2026,
            rating: 9.0,
            status: status,
            duration: "Đang cập nhật",
            casts: "Đang cập nhật",
            director: "Đang cập nhật",
            category: "Hoạt Hình"
        });

    } catch (error) {
        return JSON.stringify({
            id: "error",
            title: "Lỗi phân tích dữ liệu",
            posterUrl: "",
            servers: [{ name: "Sơ cua", episodes: [] }]
        });
    }
}

function parseDetailResponse(html) {
    try {
        var activeEpRegex = /class="[^"]*item-ep[^"]*active[^"]*"[^>]*data-m3u8="([^"]+)"[^>]*data-embed="([^2]+)"/i;
        var match = html.match(activeEpRegex);
        
        var videoUrl = "";
        var refererUrl = "https://vip.opstream11.com/"; 

        if (match) {
            videoUrl = match[1] ? match[1].trim() : match[2].trim();
            if (videoUrl.indexOf('share') !== -1) {
                refererUrl = videoUrl; 
            }
        }

        if (!videoUrl) {
            var backupMatch = html.match(/(https?:\/\/[^"']+\.m3u8[^"']*)/i);
            videoUrl = backupMatch ? backupMatch[1] : "https://cdn.example.com/video.m3u8";
        }

        return JSON.stringify({
            url: videoUrl, 
            headers: {
                "Referer": refererUrl, 
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            subtitles: []
        });

    } catch (e) {
        return JSON.stringify({
            url: "https://cdn.example.com/video.m3u8",
            headers: { "Referer": "https://vip.opstream11.com/" },
            subtitles: []
        });
    }
}

function parseEmbedResponse(html, sourceUrl) { return JSON.stringify({ url: "", isEmbed: false }); }
function parseCategoriesResponse(html) { return "[]"; }
function parseCountriesResponse(html) { return "[]"; }
function parseYearsResponse(html) { return "[]"; }
