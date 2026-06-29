// =============================================================================
// VAAPP Plugin Template
// Hướng dẫn chi tiết: xem HUONG_DAN.md
// =============================================================================

// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "rophimnew",          // ID duy nhất, không dấu, không khoảng trắng
        "name": "RophimFake",   // Tên hiển thị trong App
        "version": "1.0.1",             // Đổi version → App tự cập nhật
        "baseUrl": "https://phimvn2y.com/",
        "iconUrl": "https://url-icon-vuong.png",
        "isEnabled": true,
        "isAdult": false,
        "type": "MOVIE",                // "MOVIE" hoặc "COMIC"
        "layoutType": "VERTICAL",       // "VERTICAL" hoặc "HORIZONTAL"
        "playerType": "exoplayer"       // "exoplayer" | "embed" | "auto"
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: 'phim-le', title: 'Phim Lẻ Mới', type: 'Horizontal', path: '' },
        { slug: 'phim-bo', title: 'Phim Bộ Mới', type: 'Horizontal', path: '' },
        { slug: 'phim-chieu-rap', title: 'Phim Chiếu Rạp', type: 'Horizontal', path: '' },
        { slug: 'phim-long-tieng', title: 'Phim Lồng Tiếng', type: 'Horizontal', path: '' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'Hành Động', slug: 'hanh-dong' },
        { name: 'Kinh Dị', slug: 'kinh-di' },
        { name: 'Viễn Tưởng', slug: 'vien-tuong' },
        { name: 'Khoa Học', slug: 'khoa-hoc' },
        { name: ' Hoạt Hình ', slug: 'hoat-hinh' },
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
    return "https://phimvn2y.com/" + slug;
}

function getUrlCategories() { return ""; }
function getUrlCountries() { return ""; }
function getUrlYears() { return ""; }

// =============================================================================
// NHÓM 3: PARSER (Hàm "Mổ Xẻ Thịt")
// =============================================================================

/**
 * Xử lý HTML trang danh sách (Trang chủ, trang Thể loại, trang Tìm kiếm)
 */
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

/**
 * Xử lý HTML trang thông tin chi tiết phim
 */
function parseMovieDetail(html) {
    try {
        // =====================================================================
        // PHẦN 1: BÓC TÁCH CÁC THÔNG TIN CƠ BẢN CỦA BỘ PHIM
        // =====================================================================

        // 1. Tên phim
        var titleMatch = html.match(/<h2[^>]*class="[^"]*heading-md media-name[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
        var title = "Chưa rõ tên phim";
        if (titleMatch) {
            title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        }

        // 2. Ảnh Poster
        var posterMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
        var posterUrl = posterMatch ? posterMatch[1] : "";

        // 3. Mô tả phim
        var descMatch = html.match(/class="[^"]*child-box[^"]*"[\s\S]*?class="[^"]*child-content[^"]*"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
        var description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : "Đang cập nhật...";

        // 4. Chất lượng & Ngôn ngữ
        var qualityMatch = html.match(/<li>[^<]*<strong>Chất lượng:<\/strong>\s*([^<]+)/i);
        var quality = qualityMatch ? qualityMatch[1].trim() : "HD";

        var statusMatch = html.match(/<li>[^<]*<strong>Ngôn ngữ:<\/strong>\s*([^<]+)/i);
        var status = statusMatch ? statusMatch[1].trim() : "Vietsub";

        // =====================================================================
        // PHẦN 2: BÓC TÁCH DANH SÁCH TẬP PHIM (ĐÃ ĐỒNG BỘ THEO SỰ KIỆN DATA-M3U8)
        // =====================================================================
        var episodes = [];
        var checkedUrls = {}; 

        // Regex quét chuẩn thẻ chứa class item-ep, bốc data-m3u8 (hoặc data-embed) và v-title
        var epRegex = /class="[^"]*item-ep[^"]*"[^>]*data-m3u8="([^"]+)"[^>]*data-embed="([^"]+)"[\s\S]*?<div class="v-title">([\s\S]*?)<\/div>/g;
        var match;

        while ((match = epRegex.exec(html)) !== null) {
            // Ưu tiên lấy link m3u8 trực tiếp, nếu trống thì lấy link embed làm id định tuyến
            var videoStreamUrl = match[1] ? match[1].trim() : match[2].trim();
            var epName = match[3].replace(/<[^>]*>/g, '').trim(); 

            if (videoStreamUrl && !checkedUrls[videoStreamUrl]) {
                checkedUrls[videoStreamUrl] = true;
                episodes.push({
                    id: videoStreamUrl, // Đẩy thẳng link video làm ID tập
                    name: epName,
                    slug: epName.toLowerCase().replace(/[^a-z0-9]/g, '-')
                });
            }
        }

        // Dự phòng nếu không tìm thấy tập phim nào
        if (episodes.length === 0) {
            var canonicalMatch = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i);
            var currentUrl = canonicalMatch ? canonicalMatch[1] : "full";
            episodes.push({ id: currentUrl, name: "Full", slug: "full" });
        }

        // =====================================================================
        // PHẦN 3: ĐÓNG GÓI JSON TRẢ VỀ
        // =====================================================================
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

/**
 * Hàm lấy LINK VIDEO CUỐI CÙNG (Trọng yếu nhất)
 * Thực hiện cào trực tiếp thuộc tính dữ liệu từ thẻ tập phim đang active trong HTML
 */
function parseDetailResponse(html) {
    try {
        // Regex nhắm thẳng vào thẻ item-ep đang có class "active" để lấy link chính xác của tập đang xem
        var activeEpRegex = /class="[^"]*item-ep[^"]*active[^"]*"[^>]*data-m3u8="([^"]+)"[^>]*data-embed="([^"]+)"/i;
        var match = html.match(activeEpRegex);
        
        var videoUrl = "";
        var refererUrl = "https://vip.opstream11.com/"; // Referer mặc định cho nguồn opstream

        if (match) {
            // Ưu tiên lấy link m3u8 thô ở match[1], nếu trống thì lấy link embed ở match[2]
            videoUrl = match[1] ? match[1].trim() : match[2].trim();
            
            // Nếu là link embed dạng /share/..., ta có thể tùy biến hoặc giữ nguyên tùy theo Player của App hỗ trợ
            if (videoUrl.indexOf('share') !== -1) {
                refererUrl = videoUrl; // Sử dụng chính link embed làm Referer để tránh 403
            }
        }

        // Trường hợp khẩn cấp nếu không tìm thấy thẻ active, quét tìm đại một link m3u8 bất kỳ trong bài
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

/**
 * Hàm xử lý nâng cao (Vòng lặp Iframe / AJAX nhiều bước)
 */
function parseEmbedResponse(html, sourceUrl) {
    return JSON.stringify({ url: "", isEmbed: false }); 
}

function parseCategoriesResponse(html) { return "[]"; }
function parseCountriesResponse(html) { return "[]"; }
function parseYearsResponse(html) { return "[]"; }
