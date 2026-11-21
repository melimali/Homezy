import WidgetKit
import SwiftUI

// Uygulama veriyi app group'a "widgetData" anahtarıyla JSON olarak yazar (src/widget/ios.ts).
// İçerik, metinler (dil dahil) ve renkler uygulamada hazırlanır; Android widget'ıyla (TodayWidget.tsx) birebir aynı.
private let group = "group.com.meikai.homezy"

struct WTask: Codable, Hashable {
    var id: String?
    var emoji: String
    var name: String
    var sub: String
    var late: Bool
}

struct WPal: Codable {
    var bg: String
    var ink: String
    var muted: String
    var late: String
    var ok: String
    var today: String
    var accent: String
    var accentSoft: String
}

struct WData: Codable {
    var title: String
    var sub: String
    var streak: Int
    var empty: String
    var tasks: [WTask]
    var light: WPal
    var dark: WPal
}

private let fallbackLight = WPal(bg: "#FFFDF9", ink: "#283044", muted: "#575064", late: "#A5473D", ok: "#3C6F5A", today: "#8A5530", accent: "#4F7A5E", accentSoft: "#E4EBDF")
private let fallbackDark = WPal(bg: "#262E41", ink: "#EEF3EF", muted: "#A9B3C3", late: "#E8A199", ok: "#A9CBB6", today: "#E3B9A0", accent: "#BFD8C4", accentSoft: "#3C5045")

extension WData {
    static let empty = WData(title: "Homezy", sub: "", streak: 0, empty: "🎉", tasks: [], light: fallbackLight, dark: fallbackDark)
    static func load() -> WData {
        guard let s = UserDefaults(suiteName: group)?.string(forKey: "widgetData"),
              let d = s.data(using: .utf8),
              let v = try? JSONDecoder().decode(WData.self, from: d) else { return .empty }
        return v
    }
}

extension Color {
    init(hex: String) {
        var h = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        if h.count == 3 { h = h.map { "\($0)\($0)" }.joined() }
        var v: UInt64 = 0
        Scanner(string: h).scanHexInt64(&v)
        self.init(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
}

struct Entry: TimelineEntry {
    let date: Date
    let data: WData
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: Date(), data: .empty) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: Date(), data: WData.load()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [Entry(date: Date(), data: WData.load())], policy: .after(next)))
    }
}

struct WidgetView: View {
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) var scheme
    let e: Entry

    var body: some View {
        let d = e.data
        let p = scheme == .dark ? d.dark : d.light
        let rows = family == .systemSmall ? 2 : 4
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(d.title).font(.system(size: 20, weight: .heavy, design: .rounded)).foregroundColor(Color(hex: p.ink)).lineLimit(1)
                    if !d.sub.isEmpty {
                        Text(d.sub).font(.system(size: 12, weight: .medium, design: .rounded)).foregroundColor(Color(hex: p.muted)).lineLimit(1)
                    }
                }
                Spacer(minLength: 0)
                if d.streak > 0 {
                    Text("☕ \(d.streak)").font(.system(size: 14, weight: .black, design: .rounded)).foregroundColor(Color(hex: p.today))
                }
            }
            Spacer(minLength: 4)
            if d.tasks.isEmpty {
                Text(d.empty).font(.system(size: 14, weight: .bold, design: .rounded)).foregroundColor(Color(hex: p.ok)).lineLimit(2)
                Spacer(minLength: 0)
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(d.tasks.prefix(rows).enumerated()), id: \.offset) { _, t in
                        HStack(spacing: 10) {
                            Text(t.emoji).font(.system(size: 18))
                            VStack(alignment: .leading, spacing: 0) {
                                Text(t.name).font(.system(size: 14, weight: .bold, design: .rounded)).foregroundColor(Color(hex: p.ink)).lineLimit(1)
                                Text(t.sub).font(.system(size: 12, weight: .medium, design: .rounded)).foregroundColor(Color(hex: t.late ? p.late : p.muted)).lineLimit(1)
                            }
                            Spacer(minLength: 0)
                        }
                        .frame(height: 40)
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetBackground(Color(hex: p.bg))
        .widgetURL(URL(string: "homezy://bugun"))
    }
}

extension View {
    func widgetBackground(_ c: Color) -> AnyView {
        if #available(iOS 17.0, *) {
            return AnyView(containerBackground(c, for: .widget))
        }
        return AnyView(background(c))
    }
}

@main
struct HomezyWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HomezyWidget", provider: Provider()) { entry in
            WidgetView(e: entry)
        }
        .configurationDisplayName("Homezy · Bugün")
        .description("Bugünün işleri, serin ve günün cümlesi.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
